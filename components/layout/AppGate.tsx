'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import AuthPage from '@/app/auth/page';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import MobileLayout from '@/components/mobile/MobileLayout';
import { MobileNavProvider } from '@/lib/mobile-nav';
import { AchievementLevelUpProvider } from '@/components/achievements/AchievementLevelUpProvider';
import { JobAddModalProvider } from '@/components/jobs/JobAddModalProvider';

export default function AppGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="w-5 h-5 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <AuthPage />;

  // Pages that should render their own content on mobile
  // (already mobile-optimized, e.g. PrepPage with its own back button)
  const showPageOnMobile =
    pathname.startsWith('/prep')
    || pathname === '/profile'
    || pathname === '/friends';

  return (
    <AchievementLevelUpProvider>
      <JobAddModalProvider>
      <MobileNavProvider>
        {/* ── Desktop: fixed sidebar + document scroll only (no nested main scrollport) ── */}
        <div className="relative hidden md:block">
          <Sidebar />
          <main className="relative min-w-0 overflow-x-clip md:ml-56">
            {children}
          </main>
        </div>

        {/* ── Mobile layout ───────────────────────────────────────── */}
        <div className="md:hidden flex flex-col min-h-screen pb-16">
          {showPageOnMobile ? (
            <main data-scroll-lock-root className="flex-1 overflow-y-auto">{children}</main>
          ) : (
            <MobileLayout />
          )}
        </div>

        <MobileNav />
      </MobileNavProvider>
      </JobAddModalProvider>
    </AchievementLevelUpProvider>
  );
}
