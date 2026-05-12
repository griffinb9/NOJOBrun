'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Briefcase, Trophy, User, ChevronLeft } from 'lucide-react';
import { useMobileNav, type MobileTab } from '@/lib/mobile-nav';

const TABS: { id: MobileTab; label: string; icon: React.ElementType }[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'jobs', label: 'Jobs', icon: Briefcase },
  { id: 'achievements', label: 'Badges', icon: Trophy },
  { id: 'profile', label: 'Profile', icon: User },
];

/** Full-screen mobile routes that swap out tab shell — must reset URL when leaving. */
function isFullScreenMobileRoute(pathname: string): boolean {
  return pathname.startsWith('/prep')
    || pathname === '/profile'
    || pathname === '/friends';
}

export default function MobileNav() {
  const { tab, setTab } = useMobileNav();
  const pathname = usePathname();
  const router = useRouter();
  const isPrepJobDetail = /^\/prep\/[^/]+$/.test(pathname);

  useEffect(() => {
    if (pathname === '/profile') setTab('profile');
  }, [pathname, setTab]);

  function handleTabClick(id: MobileTab) {
    setTab(id);
    if (isFullScreenMobileRoute(pathname)) {
      router.push('/');
    }
  }

  function handleBackFromPrepJob() {
    router.push('/prep');
  }

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-[60] flex border-t border-stone-200/80 bg-white/95 backdrop-blur-sm pb-[max(0.75rem,env(safe-area-inset-bottom))] pointer-events-auto">
      {isPrepJobDetail ? (
        <button
          type="button"
          onClick={handleBackFromPrepJob}
          className="flex w-full items-center gap-1.5 px-4 py-3 text-stone-500 text-sm font-medium"
        >
          <ChevronLeft size={18} />
          Back to prep list
        </button>
      ) : (
        TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => handleTabClick(id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors ${
                active ? 'text-violet-600' : 'text-stone-400'
              }`}
            >
              <span
                className={`flex items-center justify-center w-8 h-7 rounded-xl transition-colors ${
                  active ? 'bg-violet-50' : ''
                }`}
              >
                <Icon size={18} strokeWidth={2} />
              </span>
              {label}
            </button>
          );
        })
      )}
    </nav>
  );
}
