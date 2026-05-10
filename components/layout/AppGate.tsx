'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import AuthPage from '@/app/auth/page';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import MobileLayout from '@/components/mobile/MobileLayout';
import { MobileNavProvider } from '@/lib/mobile-nav';

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
  const showPageOnMobile = pathname.startsWith('/prep/') || pathname === '/profile';

  return (
    <MobileNavProvider>
      {/* ── Desktop layout ──────────────────────────────────────── */}
      <div className="hidden md:flex min-h-screen">
        <Sidebar />
        <main className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* ── Mobile layout ───────────────────────────────────────── */}
      <div className="md:hidden flex flex-col min-h-screen pb-16">
        {showPageOnMobile ? (
          <main className="flex-1 overflow-y-auto">{children}</main>
        ) : (
          <MobileLayout />
        )}
      </div>

      <MobileNav />
    </MobileNavProvider>
  );
}
