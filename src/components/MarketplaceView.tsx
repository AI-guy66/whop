import React, { useMemo, useState } from 'react';
import { ArrowRight, Search } from 'lucide-react';
import { AppView, Membership, Whop, WhopCategory } from '../types/whop';
import { WhopCard } from './WhopCard';

interface MarketplaceViewProps {
  whops: Whop[];
  memberships: Membership[];
  onNavigate: (view: AppView) => void;
}

const CATEGORIES: Array<'All' | WhopCategory> = [
  'All',
  'Trading & Finance',
  'AI & Software',
  'E-Commerce',
  'Sports Picks',
  'Design & Media',
  'Fitness & Lifestyle',
];

type PriceFilter = 'all' | 'free' | 'paid';
type SortOption = 'featured' | 'rating' | 'members' | 'price_asc';

export const MarketplaceView: React.FC<MarketplaceViewProps> = ({
  whops,
  memberships,
  onNavigate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'All' | WhopCategory>('All');
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('featured');
  const [heroImgError, setHeroImgError] = useState(false);

  const activeWhopIds = useMemo(
    () =>
      new Set(
        memberships
          .filter((m) => m.status === 'active')
          .map((m) => m.whopId)
      ),
    [memberships]
  );

  const filteredWhops = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = whops.filter((w) => {
      if (!w.published) return false;
      if (selectedCategory !== 'All' && w.category !== selectedCategory) return false;
      if (priceFilter === 'free' && w.priceCents > 0) return false;
      if (priceFilter === 'paid' && w.priceCents === 0) return false;
      if (!q) return true;
      return (
        w.title.toLowerCase().includes(q) ||
        w.tagline.toLowerCase().includes(q) ||
        w.category.toLowerCase().includes(q) ||
        w.creatorName.toLowerCase().includes(q)
      );
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'rating') return b.ratingAvg - a.ratingAvg;
      if (sortBy === 'members') return b.memberCount - a.memberCount;
      if (sortBy === 'price_asc') return a.priceCents - b.priceCents;
      return Number(b.featured) - Number(a.featured) || b.memberCount - a.memberCount;
    });
  }, [whops, searchQuery, selectedCategory, priceFilter, sortBy]);

  return (
    <div className="max-w-[1280px] mx-auto px-6">
      {/* Section 1: Storefront Split Hero */}
      <section className="pt-10 pb-8 lg:pt-14 lg:pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-between py-2">
            <div>
              <p className="text-xs font-semibold tracking-wide text-[#FA4616] mb-3">
                Digital Marketplace & Creator OS
              </p>
              <h1 className="font-display text-[clamp(2.25rem,4vw,3.4rem)] font-bold tracking-tight text-[#111111] leading-[1.08] text-balance">
                Where the internet builds and buys digital products
              </h1>
              <p className="mt-5 text-base text-neutral-600 leading-relaxed max-w-[54ch]">
                Discover vetted communities, software tools, trading desks, and courses—or launch your own Whop storefront with built-in payments, chat, and license delivery.
              </p>
            </div>

            <div className="mt-8 space-y-4">
              {/* Live Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-neutral-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search communities, AI software, trading, design..."
                  aria-label="Search marketplace"
                  className="w-full h-12 pl-11 pr-4 bg-white border border-neutral-200 rounded-xl text-sm text-[#111111] placeholder:text-neutral-400 focus:outline-none focus:border-[#111111] transition-colors"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <a
                  href="#marketplace-catalog"
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#FA4616] hover:bg-[#e03a0c] rounded-lg transition-colors whitespace-nowrap shrink-0 min-h-[42px]"
                >
                  Browse Marketplace
                  <ArrowRight className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => onNavigate({ name: 'studio', tab: 'create' })}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-[#111111] bg-white border border-neutral-200 hover:border-neutral-400 rounded-lg transition-colors whitespace-nowrap shrink-0 min-h-[42px]"
                >
                  Start Selling
                </button>
              </div>
            </div>
          </div>

          {/* Hero Showcase Image */}
          <div className="lg:col-span-6">
            <div className="w-full h-full min-h-[280px] lg:min-h-[380px] rounded-2xl overflow-hidden border border-neutral-200 bg-neutral-100">
              {!heroImgError ? (
                <img
                  src="/src/assets/images/whop_hero_showcase_1795528646384.jpg"
                  alt="Modern digital creator workspace studio"
                  referrerPolicy="no-referrer"
                  onError={() => setHeroImgError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-neutral-900 to-neutral-800 flex items-center justify-center p-8 text-white font-display text-xl font-semibold">
                  Whop Creator Operating System
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Full-Width 4-Column Metric Strip */}
        <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-4 border-y border-neutral-200 py-5">
          <div>
            <div className="font-mono text-xl font-semibold text-[#111111] tabular-nums">
              $1.2B+
            </div>
            <div className="text-xs text-neutral-500 mt-0.5">
              Creator volume processed since launch
            </div>
          </div>
          <div>
            <div className="font-mono text-xl font-semibold text-[#111111] tabular-nums">
              3.0%
            </div>
            <div className="text-xs text-neutral-500 mt-0.5">
              Flat platform fee with instant payouts
            </div>
          </div>
          <div>
            <div className="font-mono text-xl font-semibold text-[#111111] tabular-nums">
              240,000+
            </div>
            <div className="text-xs text-neutral-500 mt-0.5">
              Active paying members across categories
            </div>
          </div>
          <div>
            <div className="font-mono text-xl font-semibold text-[#111111] tabular-nums">
              4 Apps
            </div>
            <div className="text-xs text-neutral-500 mt-0.5">
              Chat, courses, files, and announcements built in
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Marketplace Catalog & Filters */}
      <section id="marketplace-catalog" className="py-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="font-display text-2xl font-bold text-[#111111]">
              Explore Whops
            </h2>
            <p className="text-sm text-neutral-500 mt-1 tabular-nums">
              Showing {filteredWhops.length} verified digital storefronts
            </p>
          </div>

          {/* Price & Sort Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-lg">
              {(['all', 'free', 'paid'] as PriceFilter[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriceFilter(p)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 capitalize ${
                    priceFilter === p
                      ? 'bg-white text-[#111111] shadow-sm'
                      : 'text-neutral-600 hover:text-[#111111]'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <select
              aria-label="Sort storefronts"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="h-9 px-3 bg-white border border-neutral-200 rounded-lg text-xs font-medium text-[#111111] focus:outline-none focus:border-[#111111]"
            >
              <option value="featured">Sort: Featured</option>
              <option value="rating">Sort: Highest Rated</option>
              <option value="members">Sort: Most Members</option>
              <option value="price_asc">Sort: Lowest Price</option>
            </select>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-7 border-b border-neutral-200">
          {CATEGORIES.map((category) => {
            const active = selectedCategory === category;
            return (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`px-3.5 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 min-h-[40px] ${
                  active
                    ? 'bg-[#111111] text-white'
                    : 'bg-white text-neutral-600 border border-neutral-200 hover:border-neutral-400 hover:text-[#111111]'
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>

        {/* 3-Column Storefront Grid */}
        {filteredWhops.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
            {filteredWhops.map((whop) => (
              <WhopCard
                key={whop.id}
                whop={whop}
                joined={activeWhopIds.has(whop.id)}
                onSelect={(selected) =>
                  onNavigate({ name: 'whop', slug: selected.slug })
                }
              />
            ))}
          </div>
        ) : (
          <div className="bg-white border border-neutral-200 rounded-xl p-12 text-center">
            <h3 className="font-display text-lg font-semibold text-[#111111]">
              No matching storefronts
            </h3>
            <p className="text-sm text-neutral-500 mt-1 mb-5">
              Adjust your search term or category filter to discover more products.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
                setPriceFilter('all');
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-[#111111] rounded-lg hover:bg-neutral-800 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        )}
      </section>

      {/* Section 3: Creator Operating System Callout */}
      <section className="mt-12 bg-white border border-neutral-200 rounded-2xl p-8 lg:p-12">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-8 border-b border-neutral-200">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold text-[#FA4616] mb-2">
              For Digital Creators & Software Builders
            </p>
            <h2 className="font-display text-2xl lg:text-3xl font-bold text-[#111111] text-balance">
              Launch a complete digital business in under five minutes
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate({ name: 'studio', tab: 'create' })}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#111111] hover:bg-neutral-800 rounded-lg transition-colors whitespace-nowrap shrink-0 min-h-[42px]"
          >
            Open Creator Studio
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8">
          <div>
            <div className="font-mono text-xs font-semibold text-neutral-400 mb-2">
              01. Modular Delivery
            </div>
            <h3 className="font-display text-base font-semibold text-[#111111]">
              Snap in the apps you need
            </h3>
            <p className="text-sm text-neutral-600 mt-2 leading-relaxed">
              Toggle real-time member chat, structured course modules, digital file downloads, and creator announcements without stitching together third-party tools.
            </p>
          </div>
          <div>
            <div className="font-mono text-xs font-semibold text-neutral-400 mb-2">
              02. Instant Licensing
            </div>
            <h3 className="font-display text-base font-semibold text-[#111111]">
              Automated keys and access control
            </h3>
            <p className="text-sm text-neutral-600 mt-2 leading-relaxed">
              Every checkout issues a unique license key, creates a verified member pass, and unlocks gated course content and files immediately.
            </p>
          </div>
          <div>
            <div className="font-mono text-xs font-semibold text-neutral-400 mb-2">
              03. Transparent Ledger
            </div>
            <h3 className="font-display text-base font-semibold text-[#111111]">
              Real-time revenue and payouts
            </h3>
            <p className="text-sm text-neutral-600 mt-2 leading-relaxed">
              Monitor gross volume, 3% flat platform fees, member retention, and withdraw available balances to your connected account on demand.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
