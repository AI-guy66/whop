import { User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  increment,
} from 'firebase/firestore';
import {
  CATALOG_FILES,
  CATALOG_LESSONS,
  CATALOG_MESSAGES,
  CATALOG_WHOPS,
} from '../data/catalog';
import { OperationType, db, handleFirestoreError } from '../lib/firebase';
import {
  BillingInterval,
  Membership,
  Order,
  Payout,
  UserProfile,
  Whop,
  WhopAppKey,
  WhopCategory,
  WhopFile,
  WhopLesson,
  WhopMessage,
  WhopReview,
} from '../types/whop';

export function formatMoney(cents: number): string {
  if (cents <= 0) return 'Free';
  const dollars = cents / 100;
  return dollars % 1 === 0
    ? `$${dollars.toLocaleString('en-US')}`
    : `$${dollars.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatBillingSuffix(interval: BillingInterval): string {
  switch (interval) {
    case 'monthly':
      return '/mo';
    case 'quarterly':
      return '/qtr';
    case 'one_time':
      return ' one-time';
    case 'free':
      return '';
  }
}

export function generateLicenseKey(prefix = 'WHOP'): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const seg = () =>
    Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${prefix.toUpperCase().slice(0, 6)}-${seg()}-${seg()}-${seg()}`;
}

export function sanitizeSlug(input: string): string {
  const s = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);
  return s.length >= 2 ? s : `whop-${Date.now()}`;
}

export function makeSafeId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// Subscribe to published marketplace Whops and merge with catalog defaults
export function subscribeMarketplaceWhops(
  onUpdate: (whops: Whop[]) => void
): () => void {
  const q = query(collection(db, 'whops'), where('published', '==', true));
  return onSnapshot(
    q,
    (snapshot) => {
      const liveWhops = snapshot.docs.map((d) => d.data() as Whop);
      const liveIds = new Set(liveWhops.map((w) => w.id));
      const merged = [
        ...liveWhops,
        ...CATALOG_WHOPS.filter((cw) => !liveIds.has(cw.id)),
      ];
      onUpdate(merged);
    },
    (error) => {
      console.warn('Falling back to catalog whops:', error.message);
      onUpdate(CATALOG_WHOPS);
    }
  );
}

// Subscribe to Whops owned by creator
export function subscribeCreatorWhops(
  ownerId: string,
  onUpdate: (whops: Whop[]) => void
): () => void {
  const q = query(collection(db, 'whops'), where('ownerId', '==', ownerId));
  return onSnapshot(
    q,
    (snapshot) => {
      onUpdate(snapshot.docs.map((d) => d.data() as Whop));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'whops');
    }
  );
}

// Seed curated flagship catalog into Firestore under the signed-in owner account
export async function seedCatalogToFirestore(
  user: User,
  profile: UserProfile | null
): Promise<number> {
  const batch = writeBatch(db);
  let count = 0;

  for (const item of CATALOG_WHOPS) {
    const whopRef = doc(db, 'whops', item.id);
    const existing = await getDoc(whopRef);
    if (existing.exists()) continue;

    const payload: Whop = {
      id: item.id,
      slug: item.slug,
      title: item.title.slice(0, 80),
      tagline: item.tagline.slice(0, 140),
      description: item.description.slice(0, 2500),
      category: item.category,
      ownerId: user.uid,
      creatorName: (profile?.displayName || item.creatorName).slice(0, 80),
      creatorHandle: (profile?.handle || item.creatorHandle).slice(0, 40),
      coverImage: item.coverImage.slice(0, 500),
      priceCents: item.priceCents,
      billingInterval: item.billingInterval,
      ratingAvg: item.ratingAvg,
      reviewCount: item.reviewCount,
      memberCount: item.memberCount,
      featured: item.featured,
      published: true,
      apps: item.apps.slice(0, 6),
      perks: item.perks.slice(0, 8),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    batch.set(whopRef, payload);
    count++;

    const lessons = CATALOG_LESSONS[item.id] || [];
    for (const l of lessons) {
      batch.set(doc(db, 'whops', item.id, 'lessons', l.id), {
        ...l,
        createdAt: serverTimestamp(),
      });
    }

    const files = CATALOG_FILES[item.id] || [];
    for (const f of files) {
      batch.set(doc(db, 'whops', item.id, 'files', f.id), {
        ...f,
        createdAt: serverTimestamp(),
      });
    }

    const messages = CATALOG_MESSAGES[item.id] || [];
    for (const m of messages) {
      if (m.channel === 'announcements') {
        batch.set(doc(db, 'whops', item.id, 'messages', m.id), {
          id: m.id,
          whopId: item.id,
          channel: 'announcements',
          authorId: user.uid,
          authorName: (profile?.displayName || m.authorName).slice(0, 80),
          authorHandle: (profile?.handle || m.authorHandle).slice(0, 40),
          text: m.text.slice(0, 1000),
          createdAt: serverTimestamp(),
        });
      }
    }
  }

  if (count > 0) {
    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'whops');
    }
  }
  return count;
}

// Create a new Whop storefront with starter lesson, file, and welcome announcement
export async function createWhopStorefront(
  user: User,
  profile: UserProfile | null,
  input: {
    title: string;
    tagline: string;
    description: string;
    category: WhopCategory;
    coverImage: string;
    priceCents: number;
    billingInterval: BillingInterval;
    apps: WhopAppKey[];
    perks: string[];
    published: boolean;
  }
): Promise<Whop> {
  const id = makeSafeId('whop');
  const slug = `${sanitizeSlug(input.title)}-${id.slice(-4)}`;
  const whop: Whop = {
    id,
    slug,
    title: input.title.trim().slice(0, 80),
    tagline: input.tagline.trim().slice(0, 140),
    description: input.description.trim().slice(0, 2500),
    category: input.category,
    ownerId: user.uid,
    creatorName: (profile?.displayName || user.displayName || 'Creator').slice(0, 80),
    creatorHandle: (profile?.handle || 'creator').slice(0, 40),
    coverImage: input.coverImage.slice(0, 500),
    priceCents: Math.max(0, Math.min(5000000, Math.round(input.priceCents))),
    billingInterval: input.priceCents === 0 ? 'free' : input.billingInterval,
    ratingAvg: 5.0,
    reviewCount: 0,
    memberCount: 1,
    featured: true,
    published: input.published,
    apps: input.apps.length > 0 ? input.apps.slice(0, 6) : ['chat', 'courses', 'files', 'announcements'],
    perks: input.perks.filter(Boolean).slice(0, 8),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const batch = writeBatch(db);
  batch.set(doc(db, 'whops', id), whop);

  if (whop.apps.includes('courses')) {
    const lessonId = makeSafeId('lesson');
    batch.set(doc(db, 'whops', id, 'lessons', lessonId), {
      id: lessonId,
      whopId: id,
      moduleTitle: 'Module 1: Welcome & Orientation',
      title: `Getting Started with ${whop.title}`.slice(0, 120),
      duration: '8 min',
      summary: 'Your first steps, core resources, and how to get the most out of this Whop.',
      content: `Welcome to ${whop.title}!\n\nStart by downloading your starter kit inside the Files & Keys tab, then introduce yourself in #general.`,
      orderIndex: 1,
      createdAt: serverTimestamp(),
    });
  }

  if (whop.apps.includes('files')) {
    const fileId = makeSafeId('file');
    batch.set(doc(db, 'whops', id, 'files', fileId), {
      id: fileId,
      whopId: id,
      title: `${sanitizeSlug(whop.title)}_starter_pack.txt`.slice(0, 100),
      fileType: 'Starter Pack',
      fileSize: '14 KB',
      description: 'Official onboarding guide and personal member license bundle.',
      licensePrefix: sanitizeSlug(whop.title).slice(0, 6).toUpperCase(),
      createdAt: serverTimestamp(),
    });
  }

  if (whop.apps.includes('announcements') || whop.apps.includes('chat')) {
    const msgId = makeSafeId('msg');
    batch.set(doc(db, 'whops', id, 'messages', msgId), {
      id: msgId,
      whopId: id,
      channel: 'announcements',
      authorId: user.uid,
      authorName: whop.creatorName,
      authorHandle: whop.creatorHandle,
      text: `Welcome to ${whop.title}! Glad to have you inside.`,
      createdAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `whops/${id}`);
  }

  return whop;
}

export async function updateWhopStorefront(
  whopId: string,
  updates: Partial<{
    title: string;
    tagline: string;
    description: string;
    category: WhopCategory;
    coverImage: string;
    priceCents: number;
    billingInterval: BillingInterval;
    published: boolean;
    apps: WhopAppKey[];
    perks: string[];
  }>
): Promise<void> {
  const ref = doc(db, 'whops', whopId);
  const payload: Record<string, unknown> = {
    ...updates,
    updatedAt: serverTimestamp(),
  };
  try {
    await updateDoc(ref, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `whops/${whopId}`);
  }
}

export async function addLessonToWhop(
  whopId: string,
  lesson: Omit<WhopLesson, 'id' | 'whopId' | 'createdAt'>
): Promise<void> {
  const lessonId = makeSafeId('lesson');
  const ref = doc(db, 'whops', whopId, 'lessons', lessonId);
  try {
    await setDoc(ref, {
      id: lessonId,
      whopId,
      moduleTitle: lesson.moduleTitle.trim().slice(0, 80),
      title: lesson.title.trim().slice(0, 120),
      duration: lesson.duration.trim().slice(0, 24),
      summary: lesson.summary.trim().slice(0, 400),
      content: lesson.content.trim().slice(0, 4000),
      orderIndex: lesson.orderIndex,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `whops/${whopId}/lessons/${lessonId}`);
  }
}

export async function addFileToWhop(
  whopId: string,
  file: Omit<WhopFile, 'id' | 'whopId' | 'createdAt'>
): Promise<void> {
  const fileId = makeSafeId('file');
  const ref = doc(db, 'whops', whopId, 'files', fileId);
  try {
    await setDoc(ref, {
      id: fileId,
      whopId,
      title: file.title.trim().slice(0, 100),
      fileType: file.fileType.trim().slice(0, 24),
      fileSize: file.fileSize.trim().slice(0, 24),
      description: file.description.trim().slice(0, 300),
      licensePrefix: (file.licensePrefix || 'WHOP').slice(0, 16),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `whops/${whopId}/files/${fileId}`);
  }
}

// Checkout & Membership Join
export async function joinOrPurchaseWhop(
  whop: Whop,
  user: User,
  profile: UserProfile | null,
  planLabel: string,
  finalPriceCents: number,
  billingInterval: BillingInterval,
  promoCode?: string
): Promise<{ membership: Membership; order: Order; persistedToCloud: boolean }> {
  const membershipId = `${user.uid}_${whop.id}`;
  const orderId = makeSafeId('ord');
  const feeCents = Math.round(finalPriceCents * 0.03);
  const netCents = Math.max(0, finalPriceCents - feeCents);

  const membership: Membership = {
    id: membershipId,
    whopId: whop.id,
    whopTitle: whop.title.slice(0, 80),
    whopSlug: whop.slug.slice(0, 80),
    whopCover: whop.coverImage.slice(0, 500),
    userId: user.uid,
    userName: (profile?.displayName || user.displayName || 'Member').slice(0, 80),
    ownerId: whop.ownerId,
    planLabel: planLabel.slice(0, 60),
    priceCents: finalPriceCents,
    billingInterval,
    status: 'active',
    licenseKey: generateLicenseKey(whop.title.slice(0, 4)),
    completedLessons: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const order: Order = {
    id: orderId,
    whopId: whop.id,
    whopTitle: whop.title.slice(0, 80),
    buyerId: user.uid,
    buyerName: (profile?.displayName || user.displayName || 'Member').slice(0, 80),
    ownerId: whop.ownerId,
    amountCents: finalPriceCents,
    feeCents,
    netCents,
    ...(promoCode ? { promoCode: promoCode.slice(0, 32) } : {}),
    status: 'paid',
    createdAt: serverTimestamp(),
  };

  // Check if the Whop document exists in Firestore
  const whopRef = doc(db, 'whops', whop.id);
  const whopSnap = await getDoc(whopRef);

  if (!whopSnap.exists()) {
    // Catalog preview fallback when admin hasn't seeded this catalog item into Firestore yet
    return { membership, order, persistedToCloud: false };
  }

  const batch = writeBatch(db);
  batch.set(doc(db, 'memberships', membershipId), membership);
  batch.set(doc(db, 'orders', orderId), order);
  batch.update(whopRef, {
    memberCount: increment(1),
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `memberships/${membershipId}`);
  }

  return { membership, order, persistedToCloud: true };
}

export function subscribeMemberships(
  userId: string,
  onUpdate: (items: Membership[]) => void
): () => void {
  const q = query(collection(db, 'memberships'), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snap) => {
      onUpdate(snap.docs.map((d) => d.data() as Membership));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'memberships');
    }
  );
}

export function subscribeCreatorMemberships(
  ownerId: string,
  onUpdate: (items: Membership[]) => void
): () => void {
  const q = query(collection(db, 'memberships'), where('ownerId', '==', ownerId));
  return onSnapshot(
    q,
    (snap) => {
      onUpdate(snap.docs.map((d) => d.data() as Membership));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'memberships');
    }
  );
}

export function subscribeBuyerOrders(
  buyerId: string,
  onUpdate: (orders: Order[]) => void
): () => void {
  const q = query(collection(db, 'orders'), where('buyerId', '==', buyerId));
  return onSnapshot(
    q,
    (snap) => {
      onUpdate(snap.docs.map((d) => d.data() as Order));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    }
  );
}

export function subscribeCreatorOrders(
  ownerId: string,
  onUpdate: (orders: Order[]) => void
): () => void {
  const q = query(collection(db, 'orders'), where('ownerId', '==', ownerId));
  return onSnapshot(
    q,
    (snap) => {
      onUpdate(snap.docs.map((d) => d.data() as Order));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    }
  );
}

export function subscribePayouts(
  ownerId: string,
  onUpdate: (payouts: Payout[]) => void
): () => void {
  const q = query(collection(db, 'payouts'), where('ownerId', '==', ownerId));
  return onSnapshot(
    q,
    (snap) => {
      onUpdate(snap.docs.map((d) => d.data() as Payout));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'payouts');
    }
  );
}

export async function toggleLessonComplete(
  membership: Membership,
  lessonId: string
): Promise<string[]> {
  const exists = membership.completedLessons.includes(lessonId);
  const next = exists
    ? membership.completedLessons.filter((id) => id !== lessonId)
    : [...membership.completedLessons, lessonId].slice(0, 100);

  const ref = doc(db, 'memberships', membership.id);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    try {
      await updateDoc(ref, {
        completedLessons: next,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `memberships/${membership.id}`);
    }
  }
  return next;
}

export async function updateMembershipStatus(
  membershipId: string,
  status: 'active' | 'cancelled'
): Promise<void> {
  const ref = doc(db, 'memberships', membershipId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  try {
    await updateDoc(ref, {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `memberships/${membershipId}`);
  }
}

export function subscribeWhopLessons(
  whopId: string,
  onUpdate: (lessons: WhopLesson[]) => void
): () => void {
  const col = collection(db, 'whops', whopId, 'lessons');
  return onSnapshot(
    col,
    (snap) => {
      const live = snap.docs
        .map((d) => d.data() as WhopLesson)
        .sort((a, b) => a.orderIndex - b.orderIndex);
      onUpdate(live.length > 0 ? live : CATALOG_LESSONS[whopId] || []);
    },
    () => {
      onUpdate(CATALOG_LESSONS[whopId] || []);
    }
  );
}

export function subscribeWhopFiles(
  whopId: string,
  onUpdate: (files: WhopFile[]) => void
): () => void {
  const col = collection(db, 'whops', whopId, 'files');
  return onSnapshot(
    col,
    (snap) => {
      const live = snap.docs.map((d) => d.data() as WhopFile);
      onUpdate(live.length > 0 ? live : CATALOG_FILES[whopId] || []);
    },
    () => {
      onUpdate(CATALOG_FILES[whopId] || []);
    }
  );
}

export function subscribeWhopMessages(
  whopId: string,
  onUpdate: (messages: WhopMessage[]) => void
): () => void {
  const col = collection(db, 'whops', whopId, 'messages');
  return onSnapshot(
    col,
    (snap) => {
      const live = snap.docs.map((d) => d.data() as WhopMessage);
      onUpdate(live.length > 0 ? live : CATALOG_MESSAGES[whopId] || []);
    },
    () => {
      onUpdate(CATALOG_MESSAGES[whopId] || []);
    }
  );
}

export async function postWhopMessage(
  whopId: string,
  channel: 'general' | 'announcements',
  user: User,
  profile: UserProfile | null,
  text: string
): Promise<WhopMessage | null> {
  const trimmed = text.trim().slice(0, 1000);
  if (!trimmed) return null;
  const id = makeSafeId('msg');
  const message: WhopMessage = {
    id,
    whopId,
    channel,
    authorId: user.uid,
    authorName: (profile?.displayName || user.displayName || 'Member').slice(0, 80),
    authorHandle: (profile?.handle || 'member').slice(0, 40),
    text: trimmed,
    createdAt: serverTimestamp(),
  };

  const whopSnap = await getDoc(doc(db, 'whops', whopId));
  if (!whopSnap.exists()) {
    return { ...message, displayTime: 'Just now' };
  }

  try {
    await setDoc(doc(db, 'whops', whopId, 'messages', id), message);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `whops/${whopId}/messages/${id}`);
  }
  return message;
}

export function subscribeWhopReviews(
  whopId: string,
  onUpdate: (reviews: WhopReview[]) => void
): () => void {
  const col = collection(db, 'whops', whopId, 'reviews');
  return onSnapshot(
    col,
    (snap) => {
      onUpdate(snap.docs.map((d) => d.data() as WhopReview));
    },
    () => {
      onUpdate([]);
    }
  );
}

export async function submitWhopReview(
  whopId: string,
  user: User,
  profile: UserProfile | null,
  rating: number,
  comment: string
): Promise<WhopReview | null> {
  const cleanComment = comment.trim().slice(0, 800);
  if (cleanComment.length < 4) return null;

  const reviewId = user.uid;
  const review: WhopReview = {
    id: reviewId,
    whopId,
    authorId: user.uid,
    authorName: (profile?.displayName || user.displayName || 'Member').slice(0, 80),
    rating: Math.max(1, Math.min(5, Math.round(rating))),
    comment: cleanComment,
    createdAt: serverTimestamp(),
  };

  const whopSnap = await getDoc(doc(db, 'whops', whopId));
  if (!whopSnap.exists()) {
    return { ...review, displayDate: 'Just now' };
  }

  try {
    await setDoc(doc(db, 'whops', whopId, 'reviews', reviewId), review);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `whops/${whopId}/reviews/${reviewId}`);
  }
  return review;
}

export async function requestInstantPayout(
  ownerId: string,
  amountCents: number,
  destination: string
): Promise<Payout> {
  const id = makeSafeId('pay');
  const payout: Payout = {
    id,
    ownerId,
    amountCents: Math.round(amountCents),
    destination: destination.trim().slice(0, 80) || 'Bank Account',
    status: 'completed',
    createdAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'payouts', id), payout);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `payouts/${id}`);
  }
  return payout;
}
