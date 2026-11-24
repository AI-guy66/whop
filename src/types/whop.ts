export type WhopCategory =
  | 'Trading & Finance'
  | 'AI & Software'
  | 'E-Commerce'
  | 'Sports Picks'
  | 'Design & Media'
  | 'Fitness & Lifestyle';

export type BillingInterval = 'monthly' | 'quarterly' | 'one_time' | 'free';

export type WhopAppKey = 'chat' | 'courses' | 'files' | 'announcements';

export interface UserProfile {
  uid: string;
  displayName: string;
  handle: string;
  bio?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface UserPrivateInfo {
  uid: string;
  email: string;
  payoutAccount?: string;
  updatedAt?: unknown;
}

export interface Whop {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  description: string;
  category: WhopCategory;
  ownerId: string;
  creatorName: string;
  creatorHandle: string;
  coverImage: string;
  priceCents: number;
  billingInterval: BillingInterval;
  ratingAvg: number;
  reviewCount: number;
  memberCount: number;
  featured: boolean;
  published: boolean;
  apps: WhopAppKey[];
  perks: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
  isCatalogFallback?: boolean;
}

export interface WhopLesson {
  id: string;
  whopId: string;
  moduleTitle: string;
  title: string;
  duration: string;
  summary: string;
  content: string;
  orderIndex: number;
  createdAt?: unknown;
}

export interface WhopFile {
  id: string;
  whopId: string;
  title: string;
  fileType: string;
  fileSize: string;
  description: string;
  licensePrefix?: string;
  createdAt?: unknown;
}

export interface WhopMessage {
  id: string;
  whopId: string;
  channel: 'general' | 'announcements';
  authorId: string;
  authorName: string;
  authorHandle: string;
  text: string;
  createdAt?: unknown;
  displayTime?: string;
}

export interface WhopReview {
  id: string;
  whopId: string;
  authorId: string;
  authorName: string;
  rating: number;
  comment: string;
  createdAt?: unknown;
  displayDate?: string;
}

export interface Membership {
  id: string;
  whopId: string;
  whopTitle: string;
  whopSlug: string;
  whopCover: string;
  userId: string;
  userName: string;
  ownerId: string;
  planLabel: string;
  priceCents: number;
  billingInterval: BillingInterval;
  status: 'active' | 'cancelled';
  licenseKey: string;
  completedLessons: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Order {
  id: string;
  whopId: string;
  whopTitle: string;
  buyerId: string;
  buyerName: string;
  ownerId: string;
  amountCents: number;
  feeCents: number;
  netCents: number;
  promoCode?: string;
  status: 'paid' | 'refunded';
  createdAt?: unknown;
}

export interface Payout {
  id: string;
  ownerId: string;
  amountCents: number;
  destination: string;
  status: 'completed';
  createdAt?: unknown;
}

export type AppView =
  | { name: 'discover' }
  | { name: 'apps' }
  | { name: 'hubs' }
  | { name: 'whop'; slug: string }
  | { name: 'hub'; whopId: string }
  | { name: 'my-whops' }
  | { name: 'studio'; tab?: 'overview' | 'whops' | 'create' | 'members' | 'payouts' };
