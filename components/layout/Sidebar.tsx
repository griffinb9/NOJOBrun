'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Kanban, BookOpen, Trophy, Settings, LogOut, Loader2, UserCircle } from 'lucide-react';
import SettingsModal from '@/components/ui/SettingsModal';
import { useAuth } from '@/lib/auth';
import { useState } from 'react';

const nav = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/tracker', label: 'Job Tracker', icon: Kanban },
  { href: '/achievements', label: 'Achievements', icon: Trophy },
  { href: '/story-bank', label: 'STAR Formatter', icon: BookOpen },
];

function NavLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`
        group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ease-out
        ${active
          ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/90'
          : 'text-slate-600 hover:bg-slate-100/90 hover:text-slate-900'
        }
      `}
    >
      {active && (
        <span
          className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-indigo-500/90"
          aria-hidden
        />
      )}
      <Icon
        size={17}
        className={`shrink-0 transition-transform duration-200 ${active ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'} ${active ? '' : 'group-hover:scale-105'}`}
        strokeWidth={active ? 2.25 : 2}
      />
      <span className={active ? 'font-semibold' : ''}>{label}</span>
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { signOut } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
  }

  return (
    <>
      <aside
        className="relative hidden min-h-screen w-56 shrink-0 flex-col border-r border-slate-200/80 bg-gradient-to-b from-slate-50/98 via-white to-slate-50/95 px-3 py-5 backdrop-blur-xl md:flex"
        style={{ boxShadow: '4px 0 20px -10px rgba(15, 23, 42, 0.06)' }}
      >
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_45%_at_0%_0%,rgba(99,102,241,0.045),transparent_60%)]"
          aria-hidden
        />

        <div className="relative px-3 mb-8">
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-slate-800 via-indigo-700 to-slate-700 bg-clip-text text-transparent">
            NOJOB
          </span>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">job search, simplified</p>
        </div>

        <nav className="relative flex flex-1 flex-col gap-0.5 min-h-0">
          {nav.map(({ href, label, icon }) => (
            <NavLink key={href} href={href} label={label} icon={icon} active={pathname === href} />
          ))}
        </nav>

        <div className="relative mt-auto flex flex-col gap-0.5 border-t border-slate-200/70 pt-4">
          <NavLink href="/profile" label="Profile" icon={UserCircle} active={pathname === '/profile'} />

          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition-all duration-200 hover:bg-slate-100/90 hover:text-slate-800"
          >
            <Settings size={17} className="shrink-0 text-slate-400 transition-transform duration-200 group-hover:rotate-90" />
            Settings
          </button>
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="relative mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition-all duration-200 hover:bg-rose-50/90 hover:text-rose-600 disabled:opacity-50"
        >
          {signingOut ? <Loader2 size={17} className="animate-spin" /> : <LogOut size={17} />}
          {signingOut ? 'Signing out…' : 'Sign Out'}
        </button>
      </aside>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
