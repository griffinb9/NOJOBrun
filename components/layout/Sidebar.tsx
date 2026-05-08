'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Kanban, BookOpen, Trophy, Settings } from 'lucide-react';
import SettingsModal from '@/components/ui/SettingsModal';
import { useState } from 'react';

const nav = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/tracker', label: 'Job Tracker', icon: Kanban },
  { href: '/story-bank', label: 'Story Bank', icon: BookOpen },
  { href: '/achievements', label: 'Achievements', icon: Trophy },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <aside className="hidden md:flex flex-col w-56 min-h-screen bg-white border-r border-stone-200 px-3 py-5 shrink-0">
        {/* Logo */}
        <div className="px-3 mb-8">
          <span className="text-xl font-bold text-violet-600 tracking-tight">NOJOB</span>
          <p className="text-xs text-stone-400 mt-0.5">job search, simplified</p>
        </div>

        {/* Nav links */}
        <nav className="flex flex-col gap-1 flex-1">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-violet-50 text-violet-700'
                    : 'text-stone-500 hover:bg-stone-100 hover:text-stone-700'
                }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Settings */}
        <button
          onClick={() => setSettingsOpen(true)}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors w-full"
        >
          <Settings size={16} />
          Settings
        </button>
      </aside>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
