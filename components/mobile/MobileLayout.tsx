'use client';

import { useMobileNav } from '@/lib/mobile-nav';
import MobileHome from './MobileHome';
import MobileJobs from './MobileJobs';
import MobileAchievements from './MobileAchievements';
import MobileProfile from './MobileProfile';

export default function MobileLayout() {
  const { tab } = useMobileNav();

  return (
    <div data-scroll-lock-root className="flex-1 overflow-y-auto overscroll-y-contain">
      {tab === 'home' && <MobileHome />}
      {tab === 'jobs' && <MobileJobs />}
      {tab === 'achievements' && <MobileAchievements />}
      {tab === 'profile' && <MobileProfile />}
    </div>
  );
}
