import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Check,
  Download,
  Lock,
  Megaphone,
  MessageSquare,
  ShieldCheck,
  Star,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { CATALOG_LESSONS, CATALOG_REVIEWS } from '../data/catalog';
import {
  formatBillingSuffix,
  formatMoney,
  joinOrPurchaseWhop,
  subscribeWhopReviews,
  submitWhopReview,
} from '../services/whopService';
import {
  AppView,
  BillingInterval,
  Membership,
  Order,
  Whop,
  WhopAppKey,
  WhopReview,
} from '../types/whop';

interface WhopDetailViewProps {
  whop: Whop;
  membership?: Membership;
  onNavigate: (view: AppView) => void;
  onMembershipCreated: (membership: Membership, order: Order) => void;
}

const APP_LABELS: Record<WhopAppKey, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  chat: { label: 'Community Chat', icon: MessageSquare },
  courses: { label: 'Courses & Modules', icon: BookOpen },
  files: { label: 'Files & License Keys', icon: Download },
  announcements: { label: 'Announcements', icon: Megaphone },
};

export const WhopDetailView: React.FC<WhopDetailViewProps> = ({
  whop,
  membership,
  onNavigate,
  onMembershipCreated,
}) => {
  const { user, profile, signInWithGoogle } = useAuth();
  const [imgError, setImgError] = useState(false);
  const [reviews, setReviews] = useState<WhopReview[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<'primary' | 'annual'>('primary');
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [promoFeedback, setPromoFeedback] = useState<string | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [processingCheckout, setProcessingCheckout] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Review form state
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);

  const isOwner = Boolean(user && user.uid === whop.ownerId);
  const isMember = Boolean(membership && membership.status === 'active');

  useEffect(() => {
    const unsub = subscribeWhopReviews(whop.id, (live) => {
      const seed = CATALOG_REVIEWS[whop.id] || [];
      const liveIds = new Set(live.map((r) => r.id));
      setReviews([...live, ...seed.filter((r) => !liveIds.has(r.id))]);
    });
    return () => unsub();
  }, [whop.id]);

  const planOptions = useMemo(() => {
    if (whop.priceCents === 0 || whop.billingInterval === 'free') {
      return {
        primary: {
          label: 'Free Member Pass',
          priceCents: 0,
          interval: 'free' as BillingInterval,
        },
        annual: null,
      };
    }
    if (whop.billingInterval === 'monthly') {
      const annualPrice = Math.round(whop.priceCents * 12 * 0.85);
      return {
        primary: {
          label: 'Monthly Access Pass',
          priceCents: whop.priceCents,
          interval: 'monthly' as BillingInterval,
        },
        annual: {
          label: 'Annual Pass (Save 15%)',
          priceCents: annualPrice,
          interval: 'quarterly' as BillingInterval,
        },
      };
    }
    return {
      primary: {
        label:
          whop.billingInterval === 'quarterly'
            ? 'Quarterly Access Pass'
            : 'Lifetime Access Pass',
        priceCents: whop.priceCents,
        interval: whop.billingInterval,
      },
      annual: null,
    };
  }, [whop]);

  const activePlan =
    selectedPlan === 'annual' && planOptions.annual
      ? planOptions.annual
      : planOptions.primary;

  const discountCents =
    appliedPromo === 'WHOP20' && activePlan.priceCents > 0
      ? Math.round(activePlan.priceCents * 0.2)
      : 0;
  const finalPriceCents = Math.max(0, activePlan.priceCents - discountCents);

  const handleApplyPromo = () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    if (code === 'WHOP20') {
      setAppliedPromo('WHOP20');
      setPromoFeedback('20% discount applied with code WHOP20.');
    } else {
      setAppliedPromo(null);
      setPromoFeedback('Invalid promo code. Try WHOP20 for 20% off.');
    }
  };

  const handleJoinClick = async () => {
    if (isMember || isOwner) {
      onNavigate({ name: 'hub', whopId: whop.id });
      return;
    }
    if (!user) {
      await signInWithGoogle();
      return;
    }
    setCheckoutError(null);
    setCheckoutOpen(true);
  };

  const handleConfirmPurchase = async () => {
    if (!user) return;
    setProcessingCheckout(true);
    setCheckoutError(null);
    try {
      const result = await joinOrPurchaseWhop(
        whop,
        user,
        profile,
        activePlan.label,
        finalPriceCents,
        activePlan.interval,
        appliedPromo || undefined
      );
      onMembershipCreated(result.membership, result.order);
      setCheckoutOpen(false);
      onNavigate({ name: 'hub', whopId: whop.id });
    } catch (err) {
      setCheckoutError(
        err instanceof Error ? err.message : 'Checkout could not be completed.'
      );
    } finally {
      setProcessingCheckout(false);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      await signInWithGoogle();
      return;
    }
    if (reviewText.trim().length < 4) {
      setReviewMessage('Please enter at least 4 characters.');
      return;
    }
    setSubmittingReview(true);
    setReviewMessage(null);
    try {
      const saved = await submitWhopReview(
        whop.id,
        user,
        profile,
        reviewRating,
        reviewText
      );
      if (saved) {
        setReviews((prev) => [
          saved,
          ...prev.filter((r) => r.id !== saved.id),
        ]);
        setReviewText('');
        setReviewMessage('Review published.');
      }
    } catch (err) {
      setReviewMessage(
        err instanceof Error ? err.message : 'Unable to post review.'
      );
    } finally {
      setSubmittingReview(false);
    }
  };

  const previewLessons = CATALOG_LESSONS[whop.id] || [];

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-8">
      {/* Breadcrumb */}
      <button
        type="button"
        onClick={() => onNavigate({ name: 'discover' })}
        className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-[#111111] transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Discover
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left Main Content */}
        <div className="lg:col-span-8 space-y-10">
          {/* Header & Cover */}
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500 mb-2">
              <span className="font-medium text-neutral-700">{whop.category}</span>
              <span aria-hidden="true">·</span>
              <span>Created by {whop.creatorName} (@{whop.creatorHandle})</span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 tabular-nums text-neutral-800 font-medium">
                <Star className="w-3.5 h-3.5 fill-[#FA4616] text-[#FA4616]" />
                {whop.ratingAvg.toFixed(1)} ({whop.reviewCount} reviews)
              </span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">
                {whop.memberCount.toLocaleString('en-US')} members
              </span>
            </div>

            <h1 className="font-display text-3xl lg:text-4xl font-bold text-[#111111] text-balance">
              {whop.title}
            </h1>
            <p className="mt-3 text-base text-neutral-600 leading-relaxed">
              {whop.tagline}
            </p>

            <div className="mt-6 aspect-[16/9] w-full rounded-2xl overflow-hidden border border-neutral-200 bg-neutral-100">
              {!imgError ? (
                <img
                  src={whop.coverImage}
                  alt={whop.title}
                  referrerPolicy="no-referrer"
                  onError={() => setImgError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-neutral-900 flex items-center justify-center text-white font-display text-2xl font-bold">
                  {whop.title}
                </div>
              )}
            </div>
          </div>

          {/* Overview */}
          <section className="border-t border-neutral-200 pt-8">
            <h2 className="font-display text-xl font-bold text-[#111111] mb-3">
              About this Whop
            </h2>
            <p className="text-[15px] text-neutral-700 leading-relaxed whitespace-pre-line">
              {whop.description}
            </p>
          </section>

          {/* Included Whop Apps */}
          <section className="border-t border-neutral-200 pt-8">
            <h2 className="font-display text-xl font-bold text-[#111111] mb-4">
              Included Whop Apps
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {whop.apps.map((appKey) => {
                const app = APP_LABELS[appKey];
                const Icon = app.icon;
                return (
                  <div
                    key={appKey}
                    className="bg-white border border-neutral-200 rounded-xl p-4 flex items-center gap-3.5"
                  >
                    <div className="w-10 h-10 rounded-lg bg-neutral-100 text-[#111111] flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[#111111]">
                        {app.label}
                      </div>
                      <div className="text-xs text-neutral-500">
                        {isMember || isOwner || whop.priceCents === 0
                          ? 'Unlocked in workspace'
                          : 'Unlocks immediately after checkout'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Curriculum Preview */}
          {previewLessons.length > 0 && (
            <section className="border-t border-neutral-200 pt-8">
              <h2 className="font-display text-xl font-bold text-[#111111] mb-4">
                Curriculum Preview
              </h2>
              <div className="bg-white border border-neutral-200 rounded-xl divide-y divide-neutral-200">
                {previewLessons.map((lesson, idx) => (
                  <div
                    key={lesson.id}
                    className="p-4 flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <div className="text-xs text-neutral-500">
                        {lesson.moduleTitle}
                      </div>
                      <div className="text-sm font-semibold text-[#111111] truncate mt-0.5">
                        {String(idx + 1).padStart(2, '0')}. {lesson.title}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 text-xs text-neutral-500 tabular-nums">
                      <span>{lesson.duration}</span>
                      {!isMember && !isOwner && whop.priceCents > 0 && (
                        <Lock className="w-3.5 h-3.5 text-neutral-400" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Reviews */}
          <section className="border-t border-neutral-200 pt-8">
            <div className="flex items-center justify-between gap-4 mb-5">
              <h2 className="font-display text-xl font-bold text-[#111111]">
                Member Reviews ({reviews.length})
              </h2>
            </div>

            <form
              onSubmit={handleReviewSubmit}
              className="bg-white border border-neutral-200 rounded-xl p-5 mb-6 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm font-semibold text-[#111111]">
                  Leave a review
                </span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      aria-label={`Rate ${star} stars`}
                      className="p-1"
                    >
                      <Star
                        className={`w-4 h-4 ${
                          star <= reviewRating
                            ? 'fill-[#FA4616] text-[#FA4616]'
                            : 'text-neutral-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                rows={2}
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder={
                  user
                    ? 'Share your experience with this storefront...'
                    : 'Sign in to publish a review...'
                }
                className="w-full px-3.5 py-2.5 text-sm bg-[#FAFAFA] border border-neutral-200 rounded-lg focus:outline-none focus:border-[#111111]"
              />
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-neutral-500">{reviewMessage}</span>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#111111] hover:bg-neutral-800 disabled:opacity-50 rounded-lg transition-colors"
                >
                  {user ? (submittingReview ? 'Posting...' : 'Post Review') : 'Sign In to Review'}
                </button>
              </div>
            </form>

            <div className="space-y-4">
              {reviews.length === 0 ? (
                <p className="text-sm text-neutral-500">
                  No reviews yet. Be the first member to share feedback.
                </p>
              ) : (
                reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="bg-white border border-neutral-200 rounded-xl p-5"
                  >
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <span className="text-sm font-semibold text-[#111111]">
                        {rev.authorName}
                      </span>
                      <div className="flex items-center gap-1 text-xs text-neutral-500 tabular-nums">
                        <Star className="w-3.5 h-3.5 fill-[#FA4616] text-[#FA4616]" />
                        <span className="font-medium text-[#111111]">
                          {rev.rating.toFixed(1)}
                        </span>
                        {rev.displayDate && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{rev.displayDate}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-neutral-600 leading-relaxed">
                      {rev.comment}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Right Sticky Contiguous Purchase Module */}
        <aside className="lg:col-span-4 lg:sticky lg:top-24">
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 space-y-5">
            <div>
              <div className="text-xs font-medium text-neutral-500 mb-1">
                {activePlan.label}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-3xl font-bold text-[#111111] tabular-nums">
                  {formatMoney(finalPriceCents)}
                </span>
                <span className="text-sm text-neutral-500">
                  {formatBillingSuffix(activePlan.interval)}
                </span>
                {discountCents > 0 && (
                  <span className="text-sm text-neutral-400 line-through tabular-nums">
                    {formatMoney(activePlan.priceCents)}
                  </span>
                )}
              </div>
            </div>

            {/* Plan Switcher when Annual option exists */}
            {planOptions.annual && (
              <div className="grid grid-cols-2 gap-2 p-1 bg-neutral-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setSelectedPlan('primary')}
                  className={`py-2 px-3 text-xs font-semibold rounded-md transition-colors ${
                    selectedPlan === 'primary'
                      ? 'bg-white text-[#111111] shadow-sm'
                      : 'text-neutral-600 hover:text-[#111111]'
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPlan('annual')}
                  className={`py-2 px-3 text-xs font-semibold rounded-md transition-colors ${
                    selectedPlan === 'annual'
                      ? 'bg-white text-[#111111] shadow-sm'
                      : 'text-neutral-600 hover:text-[#111111]'
                  }`}
                >
                  Annual (-15%)
                </button>
              </div>
            )}

            {/* Perks Checklist */}
            <ul className="space-y-2.5 pt-2 border-t border-neutral-100">
              {whop.perks.map((perk) => (
                <li
                  key={perk}
                  className="flex items-start gap-2.5 text-sm text-neutral-700"
                >
                  <Check className="w-4 h-4 text-[#FA4616] shrink-0 mt-0.5" />
                  <span>{perk}</span>
                </li>
              ))}
            </ul>

            {/* Promo Code Input for paid plans */}
            {activePlan.priceCents > 0 && !isMember && !isOwner && (
              <div className="pt-2 border-t border-neutral-100">
                <label
                  htmlFor="promo-input"
                  className="block text-xs font-medium text-neutral-500 mb-1.5"
                >
                  Promo code (try WHOP20)
                </label>
                <div className="flex gap-2">
                  <input
                    id="promo-input"
                    type="text"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value)}
                    placeholder="WHOP20"
                    className="flex-1 h-9 px-3 text-xs bg-[#FAFAFA] border border-neutral-200 rounded-lg uppercase focus:outline-none focus:border-[#111111]"
                  />
                  <button
                    type="button"
                    onClick={handleApplyPromo}
                    className="px-3 h-9 text-xs font-semibold text-[#111111] bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
                  >
                    Apply
                  </button>
                </div>
                {promoFeedback && (
                  <p className="text-xs text-neutral-600 mt-1.5">{promoFeedback}</p>
                )}
              </div>
            )}

            {/* Primary Action Button */}
            <button
              type="button"
              onClick={handleJoinClick}
              className="w-full py-3 px-4 text-sm font-semibold text-white bg-[#FA4616] hover:bg-[#e03a0c] rounded-xl transition-colors min-h-[44px]"
            >
              {isMember || isOwner
                ? 'Open Whop Workspace'
                : !user
                ? 'Sign In to Join Whop'
                : finalPriceCents === 0
                ? 'Join for Free'
                : `Join Whop · ${formatMoney(finalPriceCents)}`}
            </button>

            <div className="flex items-center justify-center gap-2 text-xs text-neutral-500">
              <ShieldCheck className="w-4 h-4 text-neutral-400" />
              <span>Instant license & workspace access</span>
            </div>
          </div>
        </aside>
      </div>

      {/* Checkout Confirmation Modal */}
      {checkoutOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="checkout-title"
        >
          <div className="bg-white border border-neutral-200 rounded-2xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 id="checkout-title" className="font-display text-lg font-bold text-[#111111]">
                Confirm Checkout
              </h2>
              <button
                type="button"
                onClick={() => setCheckoutOpen(false)}
                aria-label="Close checkout"
                className="p-1.5 text-neutral-500 hover:text-[#111111]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-[#FAFAFA] border border-neutral-200 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-[#111111]">{whop.title}</span>
                <span className="font-mono font-semibold text-[#111111] tabular-nums">
                  {formatMoney(activePlan.priceCents)}
                </span>
              </div>
              <div className="text-xs text-neutral-500">{activePlan.label}</div>
              {discountCents > 0 && (
                <div className="flex items-center justify-between text-xs text-emerald-700 pt-1">
                  <span>Promo ({appliedPromo})</span>
                  <span className="font-mono tabular-nums">
                    -{formatMoney(discountCents)}
                  </span>
                </div>
              )}
              <div className="border-t border-neutral-200 pt-2 flex items-center justify-between text-sm font-bold text-[#111111]">
                <span>Total due today</span>
                <span className="font-mono tabular-nums">
                  {formatMoney(finalPriceCents)}
                </span>
              </div>
            </div>

            {checkoutError && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                {checkoutError}
              </p>
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setCheckoutOpen(false)}
                className="flex-1 py-2.5 text-sm font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={processingCheckout}
                onClick={handleConfirmPurchase}
                className="flex-1 py-2.5 text-sm font-semibold text-white bg-[#FA4616] hover:bg-[#e03a0c] disabled:opacity-60 rounded-xl transition-colors"
              >
                {processingCheckout
                  ? 'Activating...'
                  : finalPriceCents === 0
                  ? 'Activate Free Pass'
                  : 'Complete Purchase'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
