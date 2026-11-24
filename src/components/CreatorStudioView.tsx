import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  DollarSign,
  Eye,
  FilePlus,
  Layers,
  Plus,
  Search,
  Users,
  Wallet,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { STUDIO_COVERS } from '../data/catalog';
import {
  addFileToWhop,
  addLessonToWhop,
  createWhopStorefront,
  formatBillingSuffix,
  formatMoney,
  requestInstantPayout,
  seedCatalogToFirestore,
  updateWhopStorefront,
} from '../services/whopService';
import {
  AppView,
  BillingInterval,
  Membership,
  Order,
  Payout,
  Whop,
  WhopAppKey,
  WhopCategory,
} from '../types/whop';

interface CreatorStudioViewProps {
  initialTab?: 'overview' | 'whops' | 'create' | 'members' | 'payouts';
  creatorWhops: Whop[];
  creatorMemberships: Membership[];
  creatorOrders: Order[];
  payouts: Payout[];
  onNavigate: (view: AppView) => void;
}

const CATEGORIES: WhopCategory[] = [
  'Trading & Finance',
  'AI & Software',
  'E-Commerce',
  'Sports Picks',
  'Design & Media',
  'Fitness & Lifestyle',
];

const APP_CHOICES: { key: WhopAppKey; label: string }[] = [
  { key: 'chat', label: 'Community Chat' },
  { key: 'courses', label: 'Courses & Modules' },
  { key: 'files', label: 'Files & License Keys' },
  { key: 'announcements', label: 'Creator Announcements' },
];

export const CreatorStudioView: React.FC<CreatorStudioViewProps> = ({
  initialTab = 'overview',
  creatorWhops,
  creatorMemberships,
  creatorOrders,
  payouts,
  onNavigate,
}) => {
  const { user, profile, privateInfo, signInWithGoogle, updatePayoutAccount } =
    useAuth();
  const [tab, setTab] = useState<
    'overview' | 'whops' | 'create' | 'members' | 'payouts'
  >(initialTab);
  const [seeding, setSeeding] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');

  // Create Whop Builder State
  const [title, setTitle] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<WhopCategory>('AI & Software');
  const [coverImage, setCoverImage] = useState(STUDIO_COVERS[2].url);
  const [priceDollars, setPriceDollars] = useState('49');
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly');
  const [selectedApps, setSelectedApps] = useState<WhopAppKey[]>([
    'chat',
    'courses',
    'files',
    'announcements',
  ]);
  const [perksText, setPerksText] = useState(
    'Full workspace & live community access\nDownloadable templates & personal license key\nWeekly creator updates'
  );
  const [publishNow, setPublishNow] = useState(true);
  const [creating, setCreating] = useState(false);
  const [builderFeedback, setBuilderFeedback] = useState<string | null>(null);

  // Add Content Modal State (for existing owned Whops)
  const [editingWhopId, setEditingWhopId] = useState<string | null>(null);
  const [contentMode, setContentMode] = useState<'lesson' | 'file'>('lesson');
  const [lessonModule, setLessonModule] = useState('Module 1: Core Training');
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonDuration, setLessonDuration] = useState('12 min');
  const [lessonSummary, setLessonSummary] = useState('');
  const [lessonContent, setLessonContent] = useState('');
  const [fileTitle, setFileTitle] = useState('');
  const [fileType, setFileType] = useState('Template');
  const [fileSize, setFileSize] = useState('24 KB');
  const [fileDesc, setFileDesc] = useState('');
  const [savingContent, setSavingContent] = useState(false);

  // Payout State
  const [payoutAccountInput, setPayoutAccountInput] = useState(
    privateInfo?.payoutAccount || 'Chase Checking •••• 4821'
  );
  const [withdrawing, setWithdrawing] = useState(false);
  const [payoutFeedback, setPayoutFeedback] = useState<string | null>(null);

  const metrics = useMemo(() => {
    const paidOrders = creatorOrders.filter((o) => o.status === 'paid');
    const grossCents = paidOrders.reduce((sum, o) => sum + o.amountCents, 0);
    const netCents = paidOrders.reduce((sum, o) => sum + o.netCents, 0);
    const withdrawnCents = payouts.reduce((sum, p) => sum + p.amountCents, 0);
    const availableCents = Math.max(0, netCents - withdrawnCents);
    const activeMembers = creatorMemberships.filter(
      (m) => m.status === 'active'
    ).length;

    return {
      grossCents,
      netCents,
      availableCents,
      activeMembers,
      orderCount: paidOrders.length,
    };
  }, [creatorOrders, payouts, creatorMemberships]);

  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return creatorMemberships;
    return creatorMemberships.filter(
      (m) =>
        m.userName.toLowerCase().includes(q) ||
        m.whopTitle.toLowerCase().includes(q) ||
        m.licenseKey.toLowerCase().includes(q)
    );
  }, [creatorMemberships, memberSearch]);

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-6 py-16 text-center">
        <div className="bg-white border border-neutral-200 rounded-2xl p-8 space-y-4">
          <p className="text-xs font-semibold text-[#FA4616]">Creator Studio</p>
          <h1 className="font-display text-2xl font-bold text-[#111111]">
            Sign in to launch your Whop storefront
          </h1>
          <p className="text-sm text-neutral-600">
            Create digital products, attach courses and file downloads, track live orders, and request payouts.
          </p>
          <button
            type="button"
            onClick={signInWithGoogle}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-[#FA4616] hover:bg-[#e03a0c] rounded-xl transition-colors"
          >
            Sign In with Google
          </button>
        </div>
      </div>
    );
  }

  const toggleApp = (key: WhopAppKey) => {
    setSelectedApps((prev) =>
      prev.includes(key)
        ? prev.length > 1
          ? prev.filter((k) => k !== key)
          : prev
        : [...prev, key]
    );
  };

  const handleCreateWhop = async (e: React.FormEvent) => {
    e.preventDefault();
    setBuilderFeedback(null);
    if (title.trim().length < 2 || tagline.trim().length < 4 || description.trim().length < 10) {
      setBuilderFeedback(
        'Please complete Title (2+ chars), Tagline (4+ chars), and Description (10+ chars).'
      );
      return;
    }

    const parsedDollars = Number(priceDollars);
    const priceCents = Number.isFinite(parsedDollars) && parsedDollars > 0
      ? Math.round(parsedDollars * 100)
      : 0;

    const perks = perksText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 8);

    setCreating(true);
    try {
      const created = await createWhopStorefront(user, profile, {
        title,
        tagline,
        description,
        category,
        coverImage,
        priceCents,
        billingInterval: priceCents === 0 ? 'free' : billingInterval,
        apps: selectedApps,
        perks: perks.length > 0 ? perks : ['Instant digital access'],
        published: publishNow,
      });
      setTitle('');
      setTagline('');
      setDescription('');
      setBuilderFeedback(`Created "${created.title}" successfully.`);
      setTab('whops');
    } catch (err) {
      setBuilderFeedback(
        err instanceof Error ? err.message : 'Unable to create Whop.'
      );
    } finally {
      setCreating(false);
    }
  };

  const handleSeedCatalog = async () => {
    setSeeding(true);
    try {
      await seedCatalogToFirestore(user, profile);
      setTab('whops');
    } finally {
      setSeeding(false);
    }
  };

  const handleSaveContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWhopId) return;
    setSavingContent(true);
    try {
      if (contentMode === 'lesson') {
        await addLessonToWhop(editingWhopId, {
          moduleTitle: lessonModule,
          title: lessonTitle,
          duration: lessonDuration,
          summary: lessonSummary,
          content: lessonContent,
          orderIndex: Date.now() % 400,
        });
        setLessonTitle('');
        setLessonSummary('');
        setLessonContent('');
      } else {
        await addFileToWhop(editingWhopId, {
          title: fileTitle,
          fileType,
          fileSize,
          description: fileDesc,
          licensePrefix: 'WHOP',
        });
        setFileTitle('');
        setFileDesc('');
      }
      setEditingWhopId(null);
    } finally {
      setSavingContent(false);
    }
  };

  const handleWithdraw = async () => {
    if (metrics.availableCents <= 0) {
      setPayoutFeedback('No available balance to withdraw yet.');
      return;
    }
    setWithdrawing(true);
    setPayoutFeedback(null);
    try {
      await updatePayoutAccount(payoutAccountInput);
      await requestInstantPayout(
        user.uid,
        metrics.availableCents,
        payoutAccountInput
      );
      setPayoutFeedback(
        `Payout of ${formatMoney(metrics.availableCents)} settled to ${payoutAccountInput}.`
      );
    } catch (err) {
      setPayoutFeedback(
        err instanceof Error ? err.message : 'Payout request failed.'
      );
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Studio Sidebar */}
        <aside className="lg:col-span-3 bg-white border border-neutral-200 rounded-2xl p-4 space-y-4">
          <div className="px-2 pt-1 pb-3 border-b border-neutral-100">
            <div className="text-xs font-semibold text-[#FA4616]">
              Creator Studio
            </div>
            <div className="font-display text-base font-bold text-[#111111] truncate mt-0.5">
              {profile?.displayName || user.displayName}
            </div>
          </div>

          <nav aria-label="Creator Studio Navigation" className="space-y-1">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'whops', label: 'My Storefronts', icon: Layers },
              { id: 'create', label: 'Create Whop', icon: Plus },
              { id: 'members', label: 'Members', icon: Users },
              { id: 'payouts', label: 'Payouts', icon: Wallet },
            ].map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id as typeof tab)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    active
                      ? 'bg-[#111111] text-white'
                      : 'text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Studio Viewport */}
        <main className="lg:col-span-9 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {tab === 'overview' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="font-display text-2xl font-bold text-[#111111]">
                    Business Overview
                  </h1>
                  <p className="text-sm text-neutral-500">
                    Real-time storefront revenue, orders, and membership activity
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setTab('create')}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#FA4616] hover:bg-[#e03a0c] rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  New Whop
                </button>
              </div>

              {/* 4-Column KPI Strip */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-neutral-200 rounded-xl p-5">
                  <div className="text-xs text-neutral-500">Gross Volume</div>
                  <div className="font-mono text-2xl font-bold text-[#111111] mt-1 tabular-nums">
                    {formatMoney(metrics.grossCents)}
                  </div>
                </div>
                <div className="bg-white border border-neutral-200 rounded-xl p-5">
                  <div className="text-xs text-neutral-500">
                    Net Earnings (97%)
                  </div>
                  <div className="font-mono text-2xl font-bold text-[#111111] mt-1 tabular-nums">
                    {formatMoney(metrics.netCents)}
                  </div>
                </div>
                <div className="bg-white border border-neutral-200 rounded-xl p-5">
                  <div className="text-xs text-neutral-500">Active Members</div>
                  <div className="font-mono text-2xl font-bold text-[#111111] mt-1 tabular-nums">
                    {metrics.activeMembers}
                  </div>
                </div>
                <div className="bg-white border border-neutral-200 rounded-xl p-5">
                  <div className="text-xs text-neutral-500">Storefronts</div>
                  <div className="font-mono text-2xl font-bold text-[#111111] mt-1 tabular-nums">
                    {creatorWhops.length}
                  </div>
                </div>
              </div>

              {/* Revenue Activity Bar Chart + Recent Orders */}
              <div className="bg-white border border-neutral-200 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-display text-base font-bold text-[#111111]">
                    Recent Orders
                  </h2>
                  <span className="text-xs text-neutral-500 tabular-nums">
                    {creatorOrders.length} total transactions
                  </span>
                </div>

                {creatorOrders.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-sm text-neutral-500 mb-4">
                      No orders yet. Publish a Whop or seed the flagship catalog to test end-to-end checkouts.
                    </p>
                    {creatorWhops.length === 0 && (
                      <button
                        type="button"
                        disabled={seeding}
                        onClick={handleSeedCatalog}
                        className="px-4 py-2 text-xs font-semibold text-[#111111] bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
                      >
                        {seeding ? 'Importing...' : 'Import Starter Whops to Studio'}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-neutral-200 text-xs font-medium text-neutral-500">
                          <th className="py-2.5 pr-4">Buyer</th>
                          <th className="py-2.5 px-4">Storefront</th>
                          <th className="py-2.5 px-4">Status</th>
                          <th className="py-2.5 pl-4 text-right">Net Payout</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100 text-sm">
                        {creatorOrders.slice(0, 8).map((ord) => (
                          <tr key={ord.id}>
                            <td className="py-3 pr-4 font-medium text-[#111111]">
                              {ord.buyerName}
                            </td>
                            <td className="py-3 px-4 text-neutral-600">
                              {ord.whopTitle}
                            </td>
                            <td className="py-3 px-4 text-xs font-semibold text-emerald-700 capitalize">
                              {ord.status}
                            </td>
                            <td className="py-3 pl-4 text-right font-mono font-semibold text-[#111111] tabular-nums">
                              {formatMoney(ord.netCents)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: MY STOREFRONTS */}
          {tab === 'whops' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="font-display text-2xl font-bold text-[#111111]">
                    My Storefronts
                  </h1>
                  <p className="text-sm text-neutral-500">
                    Manage pricing, visibility, course lessons, and deliverables
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {creatorWhops.length === 0 && (
                    <button
                      type="button"
                      disabled={seeding}
                      onClick={handleSeedCatalog}
                      className="px-4 py-2 text-xs font-semibold text-[#111111] bg-white border border-neutral-200 hover:border-neutral-400 rounded-lg transition-colors"
                    >
                      {seeding ? 'Importing...' : 'Import Starter Catalog'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setTab('create')}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#FA4616] hover:bg-[#e03a0c] rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Create Whop
                  </button>
                </div>
              </div>

              {creatorWhops.length === 0 ? (
                <div className="bg-white border border-neutral-200 rounded-2xl p-10 text-center">
                  <h2 className="font-display text-lg font-semibold text-[#111111]">
                    Create your first Whop
                  </h2>
                  <p className="text-sm text-neutral-500 mt-1 mb-5">
                    Launch a custom digital storefront or import starter storefronts to explore creator management.
                  </p>
                  <button
                    type="button"
                    onClick={() => setTab('create')}
                    className="px-5 py-2.5 text-sm font-semibold text-white bg-[#111111] hover:bg-neutral-800 rounded-xl transition-colors"
                  >
                    Launch Builder
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {creatorWhops.map((w) => (
                    <div
                      key={w.id}
                      className="bg-white border border-neutral-200 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <img
                          src={w.coverImage}
                          alt={w.title}
                          referrerPolicy="no-referrer"
                          className="w-20 h-14 rounded-lg object-cover bg-neutral-100 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-xs text-neutral-500">
                            <span>{w.category}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">
                              {formatMoney(w.priceCents)}
                              {formatBillingSuffix(w.billingInterval)}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span
                              className={
                                w.published
                                  ? 'text-emerald-700 font-semibold'
                                  : 'text-amber-700 font-semibold'
                              }
                            >
                              {w.published ? 'Published' : 'Draft'}
                            </span>
                          </div>
                          <h3 className="font-display text-base font-bold text-[#111111] truncate mt-0.5">
                            {w.title}
                          </h3>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingWhopId(w.id);
                            setContentMode('lesson');
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#111111] bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          Add Lesson / File
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            updateWhopStorefront(w.id, { published: !w.published })
                          }
                          className="px-3 py-1.5 text-xs font-medium text-[#111111] bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
                        >
                          {w.published ? 'Unpublish' : 'Publish'}
                        </button>
                        <button
                          type="button"
                          onClick={() => onNavigate({ name: 'whop', slug: w.slug })}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#111111] hover:bg-neutral-800 rounded-lg transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Lesson / Deliverable Drawer */}
              {editingWhopId && (
                <div className="bg-white border border-[#111111] rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-display text-lg font-bold text-[#111111]">
                      Add Content to Storefront
                    </h2>
                    <button
                      type="button"
                      onClick={() => setEditingWhopId(null)}
                      className="text-xs font-medium text-neutral-500 hover:text-[#111111]"
                    >
                      Close
                    </button>
                  </div>

                  <div className="flex gap-2 p-1 bg-neutral-100 rounded-lg w-fit">
                    <button
                      type="button"
                      onClick={() => setContentMode('lesson')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md ${
                        contentMode === 'lesson'
                          ? 'bg-white text-[#111111] shadow-sm'
                          : 'text-neutral-600'
                      }`}
                    >
                      New Course Lesson
                    </button>
                    <button
                      type="button"
                      onClick={() => setContentMode('file')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md ${
                        contentMode === 'file'
                          ? 'bg-white text-[#111111] shadow-sm'
                          : 'text-neutral-600'
                      }`}
                    >
                      New File Deliverable
                    </button>
                  </div>

                  <form onSubmit={handleSaveContent} className="space-y-4">
                    {contentMode === 'lesson' ? (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <input
                            type="text"
                            required
                            value={lessonModule}
                            onChange={(e) => setLessonModule(e.target.value)}
                            placeholder="Module Title"
                            className="h-10 px-3 bg-[#FAFAFA] border border-neutral-200 rounded-lg text-sm"
                          />
                          <input
                            type="text"
                            required
                            value={lessonDuration}
                            onChange={(e) => setLessonDuration(e.target.value)}
                            placeholder="Duration (e.g. 14 min)"
                            className="h-10 px-3 bg-[#FAFAFA] border border-neutral-200 rounded-lg text-sm"
                          />
                        </div>
                        <input
                          type="text"
                          required
                          value={lessonTitle}
                          onChange={(e) => setLessonTitle(e.target.value)}
                          placeholder="Lesson Title"
                          className="w-full h-10 px-3 bg-[#FAFAFA] border border-neutral-200 rounded-lg text-sm"
                        />
                        <input
                          type="text"
                          required
                          value={lessonSummary}
                          onChange={(e) => setLessonSummary(e.target.value)}
                          placeholder="Short 1-line summary"
                          className="w-full h-10 px-3 bg-[#FAFAFA] border border-neutral-200 rounded-lg text-sm"
                        />
                        <textarea
                          rows={4}
                          required
                          value={lessonContent}
                          onChange={(e) => setLessonContent(e.target.value)}
                          placeholder="Full lesson content and walkthrough notes..."
                          className="w-full p-3 bg-[#FAFAFA] border border-neutral-200 rounded-lg text-sm"
                        />
                      </>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <input
                            type="text"
                            required
                            value={fileTitle}
                            onChange={(e) => setFileTitle(e.target.value)}
                            placeholder="Filename (e.g. Playbook.txt)"
                            className="sm:col-span-2 h-10 px-3 bg-[#FAFAFA] border border-neutral-200 rounded-lg text-sm"
                          />
                          <input
                            type="text"
                            required
                            value={fileType}
                            onChange={(e) => setFileType(e.target.value)}
                            placeholder="Type (PDF, Script)"
                            className="h-10 px-3 bg-[#FAFAFA] border border-neutral-200 rounded-lg text-sm"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <input
                            type="text"
                            required
                            value={fileSize}
                            onChange={(e) => setFileSize(e.target.value)}
                            placeholder="Size (e.g. 48 KB)"
                            className="h-10 px-3 bg-[#FAFAFA] border border-neutral-200 rounded-lg text-sm"
                          />
                          <input
                            type="text"
                            required
                            value={fileDesc}
                            onChange={(e) => setFileDesc(e.target.value)}
                            placeholder="Short description of deliverable"
                            className="sm:col-span-2 h-10 px-3 bg-[#FAFAFA] border border-neutral-200 rounded-lg text-sm"
                          />
                        </div>
                      </>
                    )}

                    <button
                      type="submit"
                      disabled={savingContent}
                      className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#FA4616] hover:bg-[#e03a0c] rounded-lg transition-colors"
                    >
                      <FilePlus className="w-4 h-4" />
                      {savingContent ? 'Saving...' : 'Save to Storefront'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CREATE WHOP */}
          {tab === 'create' && (
            <div className="bg-white border border-neutral-200 rounded-2xl p-6 lg:p-8">
              <h1 className="font-display text-2xl font-bold text-[#111111]">
                Create a New Whop
              </h1>
              <p className="text-sm text-neutral-500 mt-1 mb-6">
                Configure your storefront, select pricing, and toggle included member apps.
              </p>

              <form onSubmit={handleCreateWhop} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                      Storefront Title
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={80}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Kinetic Options Lab"
                      className="w-full h-10 px-3.5 bg-[#FAFAFA] border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#111111]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as WhopCategory)}
                      className="w-full h-10 px-3.5 bg-[#FAFAFA] border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#111111]"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                    Tagline (1 line)
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={140}
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    placeholder="Concise value proposition shown on marketplace cards"
                    className="w-full h-10 px-3.5 bg-[#FAFAFA] border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#111111]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                    Full Description
                  </label>
                  <textarea
                    rows={4}
                    required
                    maxLength={2500}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Explain what members receive, your track record, and how your community or software works."
                    className="w-full p-3.5 bg-[#FAFAFA] border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#111111]"
                  />
                </div>

                {/* Pricing */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                      Price (USD, enter 0 for Free)
                    </label>
                    <div className="relative">
                      <DollarSign className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="number"
                        min="0"
                        max="50000"
                        step="1"
                        value={priceDollars}
                        onChange={(e) => setPriceDollars(e.target.value)}
                        className="w-full h-10 pl-9 pr-3.5 bg-[#FAFAFA] border border-neutral-200 rounded-lg text-sm font-mono focus:outline-none focus:border-[#111111]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                      Billing Cadence
                    </label>
                    <select
                      value={Number(priceDollars) === 0 ? 'free' : billingInterval}
                      onChange={(e) =>
                        setBillingInterval(e.target.value as BillingInterval)
                      }
                      disabled={Number(priceDollars) === 0}
                      className="w-full h-10 px-3.5 bg-[#FAFAFA] border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#111111]"
                    >
                      <option value="monthly">Monthly Subscription</option>
                      <option value="quarterly">Quarterly Subscription</option>
                      <option value="one_time">One-Time Lifetime Pass</option>
                      <option value="free">Free Access</option>
                    </select>
                  </div>
                </div>

                {/* Cover Artwork Picker */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-2">
                    Cover Artwork
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {STUDIO_COVERS.map((cov) => (
                      <button
                        key={cov.url}
                        type="button"
                        onClick={() => setCoverImage(cov.url)}
                        className={`rounded-xl overflow-hidden border-2 text-left transition-all ${
                          coverImage === cov.url
                            ? 'border-[#FA4616]'
                            : 'border-neutral-200 hover:border-neutral-400'
                        }`}
                      >
                        <img
                          src={cov.url}
                          alt={cov.label}
                          className="w-full aspect-[4/3] object-cover"
                        />
                        <div className="px-2 py-1 text-[11px] font-medium text-neutral-700 truncate bg-white">
                          {cov.label}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Apps Selection */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-2">
                    Included Whop Apps
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {APP_CHOICES.map((app) => {
                      const active = selectedApps.includes(app.key);
                      return (
                        <button
                          key={app.key}
                          type="button"
                          onClick={() => toggleApp(app.key)}
                          className={`px-3 py-2.5 text-xs font-semibold rounded-lg border transition-colors text-left ${
                            active
                              ? 'bg-[#111111] text-white border-[#111111]'
                              : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400'
                          }`}
                        >
                          {app.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Perks */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                    Included Perks (one per line)
                  </label>
                  <textarea
                    rows={3}
                    value={perksText}
                    onChange={(e) => setPerksText(e.target.value)}
                    className="w-full p-3.5 bg-[#FAFAFA] border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#111111]"
                  />
                </div>

                <label className="inline-flex items-center gap-2.5 text-sm text-neutral-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={publishNow}
                    onChange={(e) => setPublishNow(e.target.checked)}
                    className="w-4 h-4 accent-[#FA4616]"
                  />
                  Publish directly to Discover Marketplace
                </label>

                {builderFeedback && (
                  <p className="text-xs text-[#FA4616] font-medium">
                    {builderFeedback}
                  </p>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-6 py-3 text-sm font-semibold text-white bg-[#FA4616] hover:bg-[#e03a0c] disabled:opacity-60 rounded-xl transition-colors"
                  >
                    {creating ? 'Creating Storefront...' : 'Launch Storefront'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 4: MEMBERS */}
          {tab === 'members' && (
            <div className="bg-white border border-neutral-200 rounded-2xl p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="font-display text-xl font-bold text-[#111111]">
                    Storefront Members ({creatorMemberships.length})
                  </h1>
                  <p className="text-xs text-neutral-500">
                    Active passes and issued license keys across your Whops
                  </p>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="search"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="Filter member or license..."
                    className="w-full h-9 pl-9 pr-3 bg-[#FAFAFA] border border-neutral-200 rounded-lg text-xs focus:outline-none focus:border-[#111111]"
                  />
                </div>
              </div>

              {filteredMembers.length === 0 ? (
                <p className="text-sm text-neutral-500 py-6">
                  No members match your filter yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-neutral-200 text-xs font-medium text-neutral-500">
                        <th className="py-2.5 pr-4">Member</th>
                        <th className="py-2.5 px-4">Storefront</th>
                        <th className="py-2.5 px-4">License Key</th>
                        <th className="py-2.5 px-4">Status</th>
                        <th className="py-2.5 pl-4 text-right">Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 text-sm">
                      {filteredMembers.map((m) => (
                        <tr key={m.id}>
                          <td className="py-3 pr-4 font-medium text-[#111111]">
                            {m.userName}
                          </td>
                          <td className="py-3 px-4 text-neutral-600">
                            {m.whopTitle}
                          </td>
                          <td className="py-3 px-4 font-mono text-xs text-neutral-600">
                            {m.licenseKey}
                          </td>
                          <td className="py-3 px-4 capitalize text-xs font-semibold text-emerald-700">
                            {m.status}
                          </td>
                          <td className="py-3 pl-4 text-right font-mono tabular-nums text-[#111111]">
                            {formatMoney(m.priceCents)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: PAYOUTS */}
          {tab === 'payouts' && (
            <div className="space-y-6">
              <div className="bg-white border border-neutral-200 rounded-2xl p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-neutral-200">
                  <div>
                    <div className="text-xs text-neutral-500">
                      Available Balance (After 3% Whop Fee)
                    </div>
                    <div className="font-mono text-3xl font-bold text-[#111111] mt-1 tabular-nums">
                      {formatMoney(metrics.availableCents)}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={withdrawing || metrics.availableCents <= 0}
                    onClick={handleWithdraw}
                    className="px-5 py-2.5 text-sm font-semibold text-white bg-[#FA4616] hover:bg-[#e03a0c] disabled:opacity-50 rounded-xl transition-colors whitespace-nowrap shrink-0"
                  >
                    {withdrawing ? 'Settling...' : 'Withdraw Instant Payout'}
                  </button>
                </div>

                <div>
                  <label
                    htmlFor="payout-account"
                    className="block text-xs font-semibold text-neutral-700 mb-1.5"
                  >
                    Connected Payout Account
                  </label>
                  <input
                    id="payout-account"
                    type="text"
                    value={payoutAccountInput}
                    onChange={(e) => setPayoutAccountInput(e.target.value)}
                    className="w-full max-w-md h-10 px-3.5 bg-[#FAFAFA] border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-[#111111]"
                  />
                </div>

                {payoutFeedback && (
                  <p className="text-xs font-medium text-emerald-700">
                    {payoutFeedback}
                  </p>
                )}
              </div>

              <div className="bg-white border border-neutral-200 rounded-2xl p-6">
                <h2 className="font-display text-lg font-bold text-[#111111] mb-4">
                  Payout History
                </h2>
                {payouts.length === 0 ? (
                  <p className="text-sm text-neutral-500">
                    No payouts withdrawn yet.
                  </p>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-neutral-200 text-xs font-medium text-neutral-500">
                        <th className="py-2.5 pr-4">Payout ID</th>
                        <th className="py-2.5 px-4">Destination</th>
                        <th className="py-2.5 px-4">Status</th>
                        <th className="py-2.5 pl-4 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 text-sm">
                      {payouts.map((p) => (
                        <tr key={p.id}>
                          <td className="py-3 pr-4 font-mono text-xs text-neutral-600">
                            {p.id}
                          </td>
                          <td className="py-3 px-4 text-neutral-700">
                            {p.destination}
                          </td>
                          <td className="py-3 px-4 capitalize text-xs font-semibold text-emerald-700">
                            {p.status}
                          </td>
                          <td className="py-3 pl-4 text-right font-mono font-semibold text-[#111111] tabular-nums">
                            {formatMoney(p.amountCents)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
