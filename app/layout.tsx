import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import AppGate from '@/components/layout/AppGate';

export const metadata: Metadata = {
  title: 'NOJOB — Job Application Tracker',
  description: 'Track your job applications and prep for interviews',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-stone-50 text-stone-800">
        <AuthProvider>
          <AppGate>{children}</AppGate>
        </AuthProvider>
      </body>
    </html>
  );
}
