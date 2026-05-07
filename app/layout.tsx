import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/layout/Sidebar';
import MobileNav from '@/components/layout/MobileNav';

export const metadata: Metadata = {
  title: 'NOJOB — Job Application Tracker',
  description: 'Track your job applications and prep for interviews',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-stone-50 text-stone-800">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 flex flex-col min-h-screen pb-20 md:pb-0 overflow-x-hidden">
            {children}
          </main>
        </div>
        <MobileNav />
      </body>
    </html>
  );
}
