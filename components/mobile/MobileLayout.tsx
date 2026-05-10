'use client';

import { useMobileNav } from '@/lib/mobile-nav';
import MobileHome from './MobileHome';
import MobileJobs from './MobileJobs';
import MobilePrep from './MobilePrep';
import MobileProfile from './MobileProfile';

export default function MobileLayout() {
  const { tab } = useMobileNav();

  return (
    <div className="flex-1 overflow-y-auto overscroll-y-contain">
      {tab === 'home'    && <MobileHome />}
      {tab === 'jobs'    && <MobileJobs />}
      {tab === 'prep'    && <MobilePrep />}
      {tab === 'profile' && <MobileProfile />}
    </div>
  );
}
