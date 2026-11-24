import React, { useState } from 'react';
import { LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AppView } from '../types/whop';

interface TopBarProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
}

export const TopBar: React.FC<TopBarProps> = ({ currentView, onNavigate }) => {
  const { user, profile, signingIn, signInWithGoogle, logout } = useAuth();
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: { label: string; active: boolean; view: AppView }[] = [
    {
      label: 'Discover',
      active: currentView.name === 'discover' || currentView.name === 'whop',
      view: { name: 'discover' },
    },
    {
      label: 'Apps',
      active: currentView.name === 'apps',
      view: { name: 'apps' },
    },
    {
      label: 'Local Hubs',
      active: currentView.name === 'hubs',
      view: { name: 'hubs' },
    },
    {
      label: 'My Whops',
      active: currentView.name === 'my-whops' || currentView.name === 'hub',
      view: { name: 'my-whops' },
    },
    {
      label: 'Creator Studio',
      active: currentView.name === 'studio',
      view: { name: 'studio', tab: 'overview' },
    },
  ];

  const handleNav = (view: AppView) => {
    setMobileMenuOpen(false);
    setAccountOpen(false);
    onNavigate(view);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-neutral-200">
      <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <button
          type="button"
          onClick={() => handleNav({ name: 'discover' })}
          className="flex items-center gap-2 text-xl font-bold tracking-tight text-[#111111] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FA4616] rounded"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            className="shrink-0"
          >
            <rect width="24" height="24" rx="6" fill="#FA4616" />
            <path
              d="M5.5 8.5L8.5 16L12 10L15.5 16L18.5 8.5"
              stroke="white"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="font-display">Whop</span>
        </button>

        {/* Zone 2: 4 Concise Single-Line Nav Links */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-7"
        >
          {navItems.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => handleNav(item.view)}
              className={`relative py-1 text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FA4616] rounded ${
                item.active
                  ? 'text-[#111111]'
                  : 'text-neutral-600 hover:text-[#111111]'
              }`}
            >
              {item.label}
              {item.active && (
                <span className="absolute left-0 right-0 -bottom-[21px] h-[2px] bg-[#FA4616]" />
              )}
            </button>
          ))}
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center gap-3 shrink-0 relative">
          {!user ? (
            <button
              type="button"
              disabled={signingIn}
              onClick={signInWithGoogle}
              className="px-4 py-2 text-sm font-semibold text-white bg-[#111111] hover:bg-neutral-800 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
            >
              {signingIn ? 'Signing in...' : 'Sign In'}
            </button>
          ) : (
            <div className="relative">
              <button
                type="button"
                onClick={() => setAccountOpen((prev) => !prev)}
                className="flex items-center gap-2.5 px-3 py-1.5 text-sm font-medium text-[#111111] bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
              >
                <span className="w-6 h-6 rounded-md bg-[#FA4616] text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {(profile?.displayName || user.displayName || 'W').charAt(0).toUpperCase()}
                </span>
                <span className="max-w-[140px] truncate">
                  {profile?.displayName || user.displayName || 'Account'}
                </span>
              </button>

              {accountOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-neutral-200 rounded-xl shadow-lg py-2 z-50">
                  <div className="px-4 py-2 border-b border-neutral-100">
                    <p className="text-sm font-semibold text-neutral-900 truncate">
                      {profile?.displayName || user.displayName}
                    </p>
                    <p className="text-xs text-neutral-500 truncate">
                      @{profile?.handle || 'member'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleNav({ name: 'my-whops' })}
                    className="w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                  >
                    My Whops & Passes
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNav({ name: 'studio', tab: 'overview' })}
                    className="w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                  >
                    Creator Studio
                  </button>
                  <div className="border-t border-neutral-100 mt-1 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setAccountOpen(false);
                        logout();
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            aria-label="Toggle navigation menu"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden p-2 text-neutral-700 hover:text-neutral-900 min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-neutral-200 bg-white px-6 py-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => handleNav(item.view)}
              className={`block w-full text-left py-2.5 text-sm font-medium ${
                item.active ? 'text-[#FA4616]' : 'text-neutral-700'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
};
