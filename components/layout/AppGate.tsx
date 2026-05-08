'use client';

import { useAuth } from '@/lib/auth';
import AuthPage from '@/app/auth/page';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';

export default function AppGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="w-5 h-5 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <AuthPage />;

  return (
    <>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 flex flex-col min-h-screen pb-20 md:pb-0 overflow-x-hidden">
          {children}
        </main>
      </div>
      <MobileNav />
    </>
  );
}
