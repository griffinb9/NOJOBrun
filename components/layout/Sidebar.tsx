'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { LayoutDashboard, Kanban, BookOpen, Trophy, Settings, LogOut, Loader2, UserCircle, Users } from 'lucide-react';
import SettingsModal from '@/components/ui/SettingsModal';
import { useAuth } from '@/lib/auth';
import { useState } from 'react';

const MotionLink = motion.create(Link);

const nav = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/tracker', label: 'Job Tracker', icon: Kanban },
  { href: '/achievements', label: 'Achievements', icon: Trophy },
  { href: '/friends', label: 'Friends', icon: Users },
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
    <MotionLink
      href={href}
      className={`
        group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200 ease-out
        ${active
          ? 'text-slate-900'
          : 'text-slate-600 hover:text-slate-900'
        }
      `}
      whileHover={{ x: 2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
    >
      {active && (
        <motion.span
          layoutId="sidebar-nav-pill"
          className="absolute inset-0 rounded-xl border border-white/90 bg-gradient-to-br from-white/98 via-indigo-50/[0.65] to-violet-50/40 shadow-[0_4px_24px_-6px_rgba(99,102,241,0.16),inset_0_1px_0_rgba(255,255,255,0.95),inset_0_-18px_32px_-20px_rgba(99,102,241,0.07)] ring-1 ring-indigo-200/50"
          style={{ zIndex: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        />
      )}
      {active && (
        <motion.span
          layoutId="sidebar-nav-accent"
          className="absolute left-0 top-1/2 z-[2] h-7 w-[3px] -translate-y-1/2 rounded-r-full bg-gradient-to-b from-sky-500 via-indigo-500 to-violet-600 shadow-[0_0_14px_rgba(99,102,241,0.5),0_0_20px_rgba(14,165,233,0.25)]"
          transition={{ type: 'spring', stiffness: 420, damping: 30 }}
        />
      )}
      <Icon
        size={17}
        className={`relative z-[1] shrink-0 transition-all duration-200 ${active ? 'text-indigo-600 drop-shadow-[0_0_10px_rgba(99,102,241,0.2)]' : 'text-slate-400 group-hover:text-indigo-500'} ${active ? '' : 'group-hover:scale-105'}`}
        strokeWidth={active ? 2.25 : 2}
      />
      <span className={`relative z-[1] tracking-tight ${active ? 'font-semibold text-slate-900' : ''}`}>{label}</span>
    </MotionLink>
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
        className="fixed left-0 top-0 z-40 hidden h-svh w-56 shrink-0 flex-col overflow-y-auto overflow-x-hidden border-r border-slate-200/75 bg-gradient-to-b from-slate-50/99 via-white to-indigo-50/[0.35] px-3 py-5 shadow-[4px_0_32px_-14px_rgba(15,23,42,0.09),inset_-1px_0_0_rgba(255,255,255,0.55)] backdrop-blur-xl md:flex"
      >
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_100%_50%_at_0%_0%,rgba(99,102,241,0.06),transparent_58%),radial-gradient(ellipse_80%_40%_at_100%_100%,rgba(245,185,66,0.04),transparent_55%)]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-200/40 to-transparent"
          aria-hidden
        />

        <div className="relative mb-8 px-3">
          <span className="text-xl font-black tracking-tight bg-gradient-to-r from-slate-800 via-indigo-700 to-violet-700 bg-clip-text text-transparent">
            NOJOB
          </span>
          <p className="mt-0.5 text-xs font-medium text-slate-500">job search, simplified</p>
        </div>

        <nav className="relative flex min-h-0 flex-1 flex-col gap-1">
          {nav.map(({ href, label, icon }) => (
            <NavLink key={href} href={href} label={label} icon={icon} active={pathname === href} />
          ))}
        </nav>

        <div className="relative mt-auto flex flex-col gap-1 border-t border-slate-200/60 pt-4">
          <NavLink href="/profile" label="Profile" icon={UserCircle} active={pathname === '/profile'} />

          <motion.button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition-colors duration-200 hover:bg-white/80 hover:text-slate-800 hover:shadow-sm hover:shadow-indigo-500/5"
            whileHover={{ x: 2 }}
            whileTap={{ scale: 0.98 }}
          >
            <Settings size={17} className="shrink-0 text-slate-400 transition-transform duration-300 group-hover:rotate-90 group-hover:text-indigo-500" />
            Settings
          </motion.button>
        </div>

        <motion.button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="relative mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors duration-200 hover:bg-rose-50/95 hover:text-rose-600 disabled:opacity-50"
          whileHover={{ x: 2 }}
          whileTap={{ scale: 0.98 }}
        >
          {signingOut ? <Loader2 size={17} className="animate-spin" /> : <LogOut size={17} />}
          {signingOut ? 'Signing out…' : 'Sign Out'}
        </motion.button>
      </aside>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
