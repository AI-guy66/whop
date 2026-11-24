import React, { useState } from 'react';
import { ArrowRight, BookOpen, Download, Megaphone, MessageSquare } from 'lucide-react';
import { AppView, WhopAppKey } from '../types/whop';

interface AppsShowcaseViewProps {
  onNavigate: (view: AppView) => void;
}

const APP_SPECS: Record<
  WhopAppKey,
  {
    title: string;
    subtitle: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    previewTitle: string;
    previewLines: string[];
  }
> = {
  chat: {
    title: 'Community Chat',
    subtitle: 'Real-time member rooms',
    description:
      'Give members a fast, distraction-free #general room right alongside your products. No Discord invite links or manual role bots required.',
    icon: MessageSquare,
    previewTitle: '#general — Live Member Feed',
    previewLines: [
      '@marcusvance: Pre-market gamma levels posted for NY open.',
      '@liamc: Caught the IB midpoint retest cleanly this morning.',
      '@sarah_k: Appreciate the risk calculator spreadsheet update!',
    ],
  },
  courses: {
    title: 'Courses & Modules',
    subtitle: 'Structured member curriculum',
    description:
      'Organize lessons into clear modules with reading notes, duration estimates, and per-member completion tracking.',
    icon: BookOpen,
    previewTitle: 'Module 1 — Curriculum Progress',
    previewLines: [
      '01. Reading Dealer Gamma Exposure (14 min) · Completed',
      '02. Liquidity Sweeps & Initial Balance (18 min) · Completed',
      '03. Volatility-Adjusted Position Sizing (11 min) · Up Next',
    ],
  },
  files: {
    title: 'Files & License Keys',
    subtitle: 'Instant digital fulfillment',
    description:
      'Deliver software templates, scripts, PDFs, and automatically generated personal license keys to every active buyer.',
    icon: Download,
    previewTitle: 'Active License & Deliverables',
    previewLines: [
      'License Key: WHOP-8K2M-9P4Q-7R1X (Active)',
      'Alpha_Gamma_Levels_Indicator_v4.pine · 42 KB',
      'Institutional_Risk_Journal_Template.csv · 18 KB',
    ],
  },
  announcements: {
    title: 'Announcements',
    subtitle: 'Creator broadcast feed',
    description:
      'Publish high-signal releases, changelog notes, and daily briefings to a read-only feed reserved exclusively for the store owner.',
    icon: Megaphone,
    previewTitle: '#announcements — Creator Only',
    previewLines: [
      'New eval harness v2.4 pushed to the starter kit.',
      'Weekly live architecture office hours start Thursday at 2:00 PM ET.',
    ],
  },
};

export const AppsShowcaseView: React.FC<AppsShowcaseViewProps> = ({ onNavigate }) => {
  const [activeApp, setActiveApp] = useState<WhopAppKey>('chat');
  const current = APP_SPECS[activeApp];
  const Icon = current.icon;

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-12">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold text-[#FA4616] mb-2">
          Modular Storefront Architecture
        </p>
        <h1 className="font-display text-3xl lg:text-4xl font-bold text-[#111111] text-balance">
          Four built-in Whop Apps power every digital storefront
        </h1>
        <p className="mt-4 text-base text-neutral-600 leading-relaxed">
          Select which apps your members receive when they join. Every app enforces real-time membership access automatically.
        </p>
      </div>

      {/* Interactive App Selector */}
      <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-5 space-y-3">
          {(Object.keys(APP_SPECS) as WhopAppKey[]).map((key) => {
            const item = APP_SPECS[key];
            const ItemIcon = item.icon;
            const selected = activeApp === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveApp(key)}
                className={`w-full text-left p-5 rounded-xl border transition-colors flex items-start gap-4 ${
                  selected
                    ? 'bg-white border-[#111111]'
                    : 'bg-white border-neutral-200 hover:border-neutral-300'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    selected
                      ? 'bg-[#FA4616] text-white'
                      : 'bg-neutral-100 text-neutral-700'
                  }`}
                >
                  <ItemIcon className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-display text-base font-semibold text-[#111111]">
                    {item.title}
                  </div>
                  <div className="text-xs text-neutral-500 mt-0.5">{item.subtitle}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Live App Preview Panel */}
        <div className="lg:col-span-7 bg-white border border-neutral-200 rounded-2xl p-8">
          <div className="flex items-center gap-3 pb-5 border-b border-neutral-200">
            <div className="w-10 h-10 rounded-lg bg-neutral-100 text-[#111111] flex items-center justify-center">
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-[#111111]">
                {current.title}
              </h2>
              <p className="text-sm text-neutral-500">{current.subtitle}</p>
            </div>
          </div>

          <p className="mt-5 text-sm text-neutral-600 leading-relaxed">
            {current.description}
          </p>

          <div className="mt-6 bg-[#FAFAFA] border border-neutral-200 rounded-xl p-5">
            <div className="text-xs font-semibold text-neutral-500 mb-3">
              {current.previewTitle}
            </div>
            <div className="space-y-2.5">
              {current.previewLines.map((line) => (
                <div
                  key={line}
                  className="bg-white border border-neutral-200 rounded-lg px-4 py-3 text-sm text-[#111111] font-mono"
                >
                  {line}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate({ name: 'studio', tab: 'create' })}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#FA4616] hover:bg-[#e03a0c] rounded-lg transition-colors"
            >
              Build a Whop with this App
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate({ name: 'discover' })}
              className="px-4 py-2.5 text-sm font-medium text-[#111111] bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
            >
              Explore Live Storefronts
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
