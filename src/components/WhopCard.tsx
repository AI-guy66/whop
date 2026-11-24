import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { formatBillingSuffix, formatMoney } from '../services/whopService';
import { Whop } from '../types/whop';

interface WhopCardProps {
  whop: Whop;
  onSelect: (whop: Whop) => void;
  joined?: boolean;
}

export const WhopCard: React.FC<WhopCardProps> = ({ whop, onSelect, joined }) => {
  const [imgError, setImgError] = useState(false);

  return (
    <article
      onClick={() => onSelect(whop)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(whop);
        }
      }}
      tabIndex={0}
      role="button"
      className="group bg-white border border-neutral-200 rounded-xl overflow-hidden flex flex-col cursor-pointer transition-all duration-150 hover:-translate-y-0.5 hover:border-neutral-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FA4616]"
    >
      {/* 4:3 Media Header */}
      <div className="relative aspect-[4/3] w-full bg-neutral-100 overflow-hidden">
        {!imgError && whop.coverImage ? (
          <img
            src={whop.coverImage}
            alt={whop.title}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-neutral-800 to-neutral-950 flex flex-col items-center justify-center p-6 text-center">
            <span className="font-display text-lg font-bold text-white">
              {whop.title}
            </span>
            <span className="text-xs text-neutral-400 mt-1">{whop.category}</span>
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="p-5 flex-1 flex flex-col justify-between gap-4">
        <div>
          {/* Unboxed Metadata Line (Zero-Pill Discipline) */}
          <div className="flex items-center gap-1.5 text-xs text-neutral-500 mb-1.5 truncate">
            <span className="font-medium text-neutral-700">{whop.category}</span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1 tabular-nums text-neutral-700">
              <Star className="w-3 h-3 fill-[#FA4616] text-[#FA4616]" />
              {whop.ratingAvg.toFixed(1)}
            </span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">
              {whop.memberCount.toLocaleString('en-US')} members
            </span>
          </div>

          <h3 className="font-display text-[17px] font-semibold text-[#111111] group-hover:text-[#FA4616] transition-colors truncate">
            {whop.title}
          </h3>
          <p className="mt-1.5 text-sm text-neutral-600 line-clamp-2 leading-relaxed">
            {whop.tagline}
          </p>
        </div>

        {/* Baseline Footer */}
        <div className="pt-3 border-t border-neutral-100 flex items-center justify-between gap-3">
          <span className="text-xs text-neutral-500 truncate">
            by <span className="text-neutral-800 font-medium">{whop.creatorName}</span>
          </span>
          <div className="flex items-center gap-2 shrink-0">
            {joined ? (
              <span className="text-xs font-semibold text-emerald-700 whitespace-nowrap">
                Member Access
              </span>
            ) : (
              <span className="text-[15px] font-semibold text-[#111111] tabular-nums whitespace-nowrap">
                {formatMoney(whop.priceCents)}
                <span className="text-xs font-normal text-neutral-500">
                  {formatBillingSuffix(whop.billingInterval)}
                </span>
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};
