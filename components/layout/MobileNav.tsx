'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Home, Briefcase, FileText, User, ChevronLeft } from 'lucide-react';
import { useMobileNav, type MobileTab } from '@/lib/mobile-nav';

const TABS: { id: MobileTab; label: string; icon: React.ElementType }[] = [
  { id: 'home',    label: 'Home',    icon: Home      },
  { id: 'jobs',    label: 'Jobs',    icon: Briefcase },
  { id: 'prep',    label: 'Prep',    icon: FileText  },
  { id: 'profile', label: 'Profile', icon: User      },
];

export default function MobileNav() {
  const { tab, setTab } = useMobileNav();
  const pathname = usePathname();
  const router = useRouter();
  const isPrepDetail = pathname.startsWith('/prep/');

  function handleBack() {
    setTab('prep');
    router.push('/');
  }

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-sm border-t border-stone-200/80 flex z-50">
      {isPrepDetail ? (
        <button
          onClick={handleBack}
          className="flex items-center gap-1.5 px-4 py-3 text-stone-500 text-sm font-medium"
        >
          <ChevronLeft size={18} />
          Back to Prep
        </button>
      ) : (
        TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                active ? 'text-violet-600' : 'text-stone-400'
              }`}
            >
              <span className={`flex items-center justify-center w-8 h-7 rounded-xl transition-colors ${
                active ? 'bg-violet-50' : ''
              }`}>
                <Icon size={19} />
              </span>
              {label}
            </button>
          );
        })
      )}
    </nav>
  );
}
