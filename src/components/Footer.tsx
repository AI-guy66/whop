import React from 'react';
import { AppView } from '../types/whop';

interface FooterProps {
  onNavigate: (view: AppView) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="border-t border-neutral-200 bg-white mt-20">
      <div className="max-w-[1280px] mx-auto px-6 py-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-base font-bold text-[#111111]">
            <span className="w-5 h-5 rounded bg-[#FA4616] text-white text-xs flex items-center justify-center font-display">
              W
            </span>
            <span className="font-display">Whop</span>
          </div>
          <p className="text-sm text-neutral-500 mt-2">
            Digital storefront infrastructure for communities, software, and courses.
          </p>
        </div>

        <nav aria-label="Footer navigation" className="flex flex-wrap items-center gap-6 text-sm text-neutral-600">
          <button
            type="button"
            onClick={() => onNavigate({ name: 'discover' })}
            className="hover:text-[#111111] transition-colors whitespace-nowrap"
          >
            Discover
          </button>
          <button
            type="button"
            onClick={() => onNavigate({ name: 'apps' })}
            className="hover:text-[#111111] transition-colors whitespace-nowrap"
          >
            Whop Apps
          </button>
          <button
            type="button"
            onClick={() => onNavigate({ name: 'hubs' })}
            className="hover:text-[#111111] transition-colors whitespace-nowrap"
          >
            Local Hubs
          </button>
          <button
            type="button"
            onClick={() => onNavigate({ name: 'my-whops' })}
            className="hover:text-[#111111] transition-colors whitespace-nowrap"
          >
            My Whops
          </button>
          <button
            type="button"
            onClick={() => onNavigate({ name: 'studio', tab: 'overview' })}
            className="hover:text-[#111111] transition-colors whitespace-nowrap"
          >
            Start Selling
          </button>
        </nav>

        <p className="text-xs text-neutral-400">
          © {new Date().getFullYear()} Whop Marketplace Clone
        </p>
      </div>
    </footer>
  );
};
