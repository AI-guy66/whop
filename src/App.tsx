/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AppsShowcaseView } from './components/AppsShowcaseView';
import { CreatorStudioView } from './components/CreatorStudioView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Footer } from './components/Footer';
import { GeminiChatbot } from './components/GeminiChatbot';
import { LocalHubsMapView } from './components/LocalHubsMapView';
import { MarketplaceView } from './components/MarketplaceView';
import { MyWhopsView } from './components/MyWhopsView';
import { TopBar } from './components/TopBar';
import { WhopDetailView } from './components/WhopDetailView';
import { WhopWorkspaceView } from './components/WhopWorkspaceView';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CATALOG_WHOPS } from './data/catalog';
import {
  seedCatalogToFirestore,
  subscribeBuyerOrders,
  subscribeCreatorMemberships,
  subscribeCreatorOrders,
  subscribeCreatorWhops,
  subscribeMarketplaceWhops,
  subscribeMemberships,
  subscribePayouts,
} from './services/whopService';
import { AppView, Membership, Order, Payout, Whop } from './types/whop';

function parseHashToView(): AppView {
  const hash = window.location.hash.replace(/^#\/?/, '');
  if (!hash || hash === 'discover') return { name: 'discover' };
  if (hash === 'apps') return { name: 'apps' };
  if (hash === 'hubs') return { name: 'hubs' };
  if (hash === 'my-whops') return { name: 'my-whops' };
  if (hash.startsWith('studio')) {
    const parts = hash.split('/');
    const tab = parts[1] as
      | 'overview'
      | 'whops'
      | 'create'
      | 'members'
      | 'payouts'
      | undefined;
    return { name: 'studio', tab: tab || 'overview' };
  }
  if (hash.startsWith('whop/')) {
    return { name: 'whop', slug: hash.slice(5) };
  }
  if (hash.startsWith('hub/')) {
    return { name: 'hub', whopId: hash.slice(4) };
  }
  return { name: 'discover' };
}

function viewToHash(view: AppView): string {
  switch (view.name) {
    case 'discover':
      return '#/discover';
    case 'apps':
      return '#/apps';
    case 'hubs':
      return '#/hubs';
    case 'my-whops':
      return '#/my-whops';
    case 'studio':
      return `#/studio/${view.tab || 'overview'}`;
    case 'whop':
      return `#/whop/${view.slug}`;
    case 'hub':
      return `#/hub/${view.whopId}`;
  }
}

const WhopShell: React.FC = () => {
  const { user, profile, authReady } = useAuth();
  const [currentView, setCurrentView] = useState<AppView>(parseHashToView);
  const [marketplaceWhops, setMarketplaceWhops] = useState<Whop[]>(CATALOG_WHOPS);
  const [creatorWhops, setCreatorWhops] = useState<Whop[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [localMemberships, setLocalMemberships] = useState<Membership[]>([]);
  const [buyerOrders, setBuyerOrders] = useState<Order[]>([]);
  const [localOrders, setLocalOrders] = useState<Order[]>([]);
  const [creatorMemberships, setCreatorMemberships] = useState<Membership[]>([]);
  const [creatorOrders, setCreatorOrders] = useState<Order[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [mapsQuotaExceeded, setMapsQuotaExceeded] = useState(false);
  const seededAdminRef = useRef(false);

  useEffect(() => {
    const onQuotaExceeded = () => setMapsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuotaExceeded);
  }, []);

  // Sync browser hash navigation
  useEffect(() => {
    const onHashChange = () => setCurrentView(parseHashToView());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = (view: AppView) => {
    const nextHash = viewToHash(view);
    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash;
    }
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  };

  // Subscribe to public marketplace Whops
  useEffect(() => {
    const unsub = subscribeMarketplaceWhops(setMarketplaceWhops);
    return () => unsub();
  }, []);

  // Subscribe to authenticated user collections
  useEffect(() => {
    if (!authReady || !user) {
      setCreatorWhops([]);
      setMemberships([]);
      setBuyerOrders([]);
      setCreatorMemberships([]);
      setCreatorOrders([]);
      setPayouts([]);
      return;
    }

    if (
      user.email === 'dennohtumoh69@gmail.com' &&
      !seededAdminRef.current
    ) {
      seededAdminRef.current = true;
      seedCatalogToFirestore(user, profile).catch((err) =>
        console.warn('Auto-seed skipped:', err)
      );
    }

    const unsubCreatorWhops = subscribeCreatorWhops(user.uid, setCreatorWhops);
    const unsubMemberships = subscribeMemberships(user.uid, setMemberships);
    const unsubBuyerOrders = subscribeBuyerOrders(user.uid, setBuyerOrders);
    const unsubCreatorMemberships = subscribeCreatorMemberships(
      user.uid,
      setCreatorMemberships
    );
    const unsubCreatorOrders = subscribeCreatorOrders(
      user.uid,
      setCreatorOrders
    );
    const unsubPayouts = subscribePayouts(user.uid, setPayouts);

    return () => {
      unsubCreatorWhops();
      unsubMemberships();
      unsubBuyerOrders();
      unsubCreatorMemberships();
      unsubCreatorOrders();
      unsubPayouts();
    };
  }, [authReady, user, profile]);

  const allKnownWhops = useMemo(() => {
    const map = new Map<string, Whop>();
    for (const w of marketplaceWhops) map.set(w.id, w);
    for (const w of creatorWhops) map.set(w.id, w);
    return Array.from(map.values());
  }, [marketplaceWhops, creatorWhops]);

  const allMemberships = useMemo(() => {
    const map = new Map<string, Membership>();
    for (const m of localMemberships) map.set(m.id, m);
    for (const m of memberships) map.set(m.id, m);
    return Array.from(map.values());
  }, [memberships, localMemberships]);

  const allBuyerOrders = useMemo(() => {
    const map = new Map<string, Order>();
    for (const o of localOrders) map.set(o.id, o);
    for (const o of buyerOrders) map.set(o.id, o);
    return Array.from(map.values());
  }, [buyerOrders, localOrders]);

  const handleMembershipCreated = (membership: Membership, order: Order) => {
    setLocalMemberships((prev) => [
      membership,
      ...prev.filter((m) => m.id !== membership.id),
    ]);
    setLocalOrders((prev) => [order, ...prev.filter((o) => o.id !== order.id)]);
  };

  const handleMembershipUpdated = (updated: Membership) => {
    setLocalMemberships((prev) =>
      prev.some((m) => m.id === updated.id)
        ? prev.map((m) => (m.id === updated.id ? updated : m))
        : [updated, ...prev]
    );
  };

  const renderContent = () => {
    if (currentView.name === 'apps') {
      return <AppsShowcaseView onNavigate={navigate} />;
    }

    if (currentView.name === 'hubs') {
      return <LocalHubsMapView onNavigate={navigate} />;
    }

    if (currentView.name === 'my-whops') {
      return (
        <MyWhopsView
          memberships={allMemberships}
          orders={allBuyerOrders}
          onNavigate={navigate}
        />
      );
    }

    if (currentView.name === 'studio') {
      return (
        <CreatorStudioView
          key={currentView.tab || 'overview'}
          initialTab={currentView.tab}
          creatorWhops={creatorWhops}
          creatorMemberships={creatorMemberships}
          creatorOrders={creatorOrders}
          payouts={payouts}
          onNavigate={navigate}
        />
      );
    }

    if (currentView.name === 'whop') {
      const target = allKnownWhops.find((w) => w.slug === currentView.slug);
      if (!target) {
        return (
          <div className="max-w-xl mx-auto px-6 py-16 text-center">
            <div className="bg-white border border-neutral-200 rounded-2xl p-8">
              <h2 className="font-display text-xl font-bold text-[#111111]">
                Storefront not found
              </h2>
              <p className="text-sm text-neutral-500 mt-1 mb-5">
                This Whop may have been unpublished or moved.
              </p>
              <button
                type="button"
                onClick={() => navigate({ name: 'discover' })}
                className="px-4 py-2 text-sm font-semibold text-white bg-[#111111] rounded-lg"
              >
                Back to Discover
              </button>
            </div>
          </div>
        );
      }
      const membership = allMemberships.find((m) => m.whopId === target.id);
      return (
        <WhopDetailView
          whop={target}
          membership={membership}
          onNavigate={navigate}
          onMembershipCreated={handleMembershipCreated}
        />
      );
    }

    if (currentView.name === 'hub') {
      const target = allKnownWhops.find((w) => w.id === currentView.whopId);
      if (!target) {
        return (
          <div className="max-w-xl mx-auto px-6 py-16 text-center">
            <div className="bg-white border border-neutral-200 rounded-2xl p-8">
              <h2 className="font-display text-xl font-bold text-[#111111]">
                Workspace unavailable
              </h2>
              <button
                type="button"
                onClick={() => navigate({ name: 'my-whops' })}
                className="mt-4 px-4 py-2 text-sm font-semibold text-white bg-[#111111] rounded-lg"
              >
                Return to My Whops
              </button>
            </div>
          </div>
        );
      }
      const membership = allMemberships.find((m) => m.whopId === target.id);
      return (
        <WhopWorkspaceView
          whop={target}
          membership={membership}
          onNavigate={navigate}
          onMembershipUpdated={handleMembershipUpdated}
        />
      );
    }

    return (
      <MarketplaceView
        whops={marketplaceWhops}
        memberships={allMemberships}
        onNavigate={navigate}
      />
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA]">
      {mapsQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}
      <TopBar currentView={currentView} onNavigate={navigate} />
      <div className="flex-1">{renderContent()}</div>
      <Footer onNavigate={navigate} />
      <GeminiChatbot />
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <WhopShell />
      </AuthProvider>
    </ErrorBoundary>
  );
}
