import React from 'react';
import { ArrowRight, ExternalLink, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatBillingSuffix, formatMoney } from '../services/whopService';
import { AppView, Membership, Order } from '../types/whop';

interface MyWhopsViewProps {
  memberships: Membership[];
  orders: Order[];
  onNavigate: (view: AppView) => void;
}

export const MyWhopsView: React.FC<MyWhopsViewProps> = ({
  memberships,
  orders,
  onNavigate,
}) => {
  const { user, signInWithGoogle } = useAuth();

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-6 py-16 text-center">
        <div className="bg-white border border-neutral-200 rounded-2xl p-8 space-y-4">
          <h1 className="font-display text-2xl font-bold text-[#111111]">
            Sign in to access My Whops
          </h1>
          <p className="text-sm text-neutral-600">
            View your joined communities, course progress, personal license keys, and order receipts.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={signInWithGoogle}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-[#111111] hover:bg-neutral-800 rounded-xl transition-colors"
            >
              Sign In with Google
            </button>
            <button
              type="button"
              onClick={() => onNavigate({ name: 'discover' })}
              className="px-4 py-2.5 text-sm font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors"
            >
              Browse Marketplace
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-10 space-y-12">
      {/* Section 1: Active Memberships */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-bold text-[#111111]">
              My Whops
            </h1>
            <p className="text-sm text-neutral-500 mt-1">
              Communities, software licenses, and courses in your account
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate({ name: 'discover' })}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[#111111] bg-white border border-neutral-200 hover:border-neutral-400 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            Discover More
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {memberships.length === 0 ? (
          <div className="bg-white border border-neutral-200 rounded-2xl p-10 text-center">
            <h2 className="font-display text-lg font-semibold text-[#111111]">
              You have not joined any Whops yet
            </h2>
            <p className="text-sm text-neutral-500 mt-1 mb-5">
              Explore the marketplace to join a free launchpad or purchase a creator pass.
            </p>
            <button
              type="button"
              onClick={() => onNavigate({ name: 'discover' })}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-[#FA4616] hover:bg-[#e03a0c] rounded-xl transition-colors"
            >
              Explore Marketplace
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {memberships.map((m) => (
              <div
                key={m.id}
                className="bg-white border border-neutral-200 rounded-xl overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="aspect-[16/9] bg-neutral-100 overflow-hidden">
                    <img
                      src={m.whopCover}
                      alt={m.whopTitle}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-5 space-y-2">
                    <div className="flex items-center justify-between text-xs text-neutral-500">
                      <span>{m.planLabel}</span>
                      <span
                        className={`font-semibold capitalize ${
                          m.status === 'active'
                            ? 'text-emerald-700'
                            : 'text-neutral-500'
                        }`}
                      >
                        {m.status}
                      </span>
                    </div>
                    <h2 className="font-display text-lg font-bold text-[#111111] truncate">
                      {m.whopTitle}
                    </h2>
                    <div className="flex items-center gap-1.5 text-xs font-mono text-neutral-600 pt-1">
                      <KeyRound className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                      <span className="truncate">{m.licenseKey}</span>
                    </div>
                  </div>
                </div>

                <div className="px-5 pb-5 pt-3 border-t border-neutral-100 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onNavigate({ name: 'hub', whopId: m.whopId })}
                    className="flex-1 py-2 px-3 text-xs font-semibold text-white bg-[#111111] hover:bg-neutral-800 rounded-lg transition-colors"
                  >
                    Open Workspace
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate({ name: 'whop', slug: m.whopSlug })}
                    aria-label={`View ${m.whopTitle} storefront`}
                    className="p-2 text-neutral-600 hover:text-[#111111] bg-neutral-100 rounded-lg transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Section 2: Purchase Receipts */}
      <section>
        <h2 className="font-display text-xl font-bold text-[#111111] mb-4">
          Order Receipts
        </h2>
        <div className="bg-white border border-neutral-200 rounded-xl overflow-x-auto">
          {orders.length === 0 ? (
            <p className="p-6 text-sm text-neutral-500">
              No completed orders recorded on your account yet.
            </p>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 text-xs font-medium text-neutral-500">
                  <th className="py-3 px-4">Order ID</th>
                  <th className="py-3 px-4">Storefront</th>
                  <th className="py-3 px-4">Promo</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-sm">
                {orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-neutral-50">
                    <td className="py-3 px-4 font-mono text-xs text-neutral-600">
                      {ord.id}
                    </td>
                    <td className="py-3 px-4 font-medium text-[#111111]">
                      {ord.whopTitle}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-neutral-500">
                      {ord.promoCode || '—'}
                    </td>
                    <td className="py-3 px-4 capitalize text-xs font-semibold text-emerald-700">
                      {ord.status}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-[#111111] tabular-nums">
                      {formatMoney(ord.amountCents)}
                      {ord.amountCents === 0 ? '' : formatBillingSuffix('one_time').replace(' one-time', '')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
};
