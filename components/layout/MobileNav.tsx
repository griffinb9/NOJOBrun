'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Kanban, BookOpen, Trophy, MoreHorizontal, Settings, LogOut, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import SettingsModal from '@/components/ui/SettingsModal';

const nav = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/tracker', label: 'Tracker', icon: Kanban },
  { href: '/story-bank', label: 'Stories', icon: BookOpen },
  { href: '/achievements', label: 'Wins', icon: Trophy },
];

export default function MobileNav() {
  const pathname = usePathname();
  const { signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    setMenuOpen(false);
    await signOut();
  }

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 flex z-50">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                active ? 'text-violet-600' : 'text-stone-400'
              }`}
            >
              <Icon size={20} />
              {label}
            </Link>
          );
        })}

        {/* More */}
        <button
          onClick={() => setMenuOpen(true)}
          className="flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium text-stone-400"
        >
          <MoreHorizontal size={20} />
          More
        </button>
      </nav>

      {/* More menu overlay */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex items-end" onClick={() => setMenuOpen(false)}>
          <div
            className="w-full bg-white rounded-t-2xl shadow-xl p-4 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-stone-200 rounded-full mx-auto mb-4" />
            <button
              onClick={() => { setMenuOpen(false); setSettingsOpen(true); }}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors"
            >
              <Settings size={18} className="text-stone-400" />
              Settings
            </button>
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors disabled:opacity-50"
            >
              {signingOut
                ? <Loader2 size={18} className="animate-spin text-stone-400" />
                : <LogOut size={18} className="text-stone-400" />}
              {signingOut ? 'Signing out…' : 'Sign Out'}
            </button>
          </div>
        </div>
      )}

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
