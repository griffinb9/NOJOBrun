'use client';

import AchievementsPage from '@/components/achievements/AchievementsPage';

export default function MobileAchievements() {
  return (
    <div className="min-h-full bg-stone-50 overflow-x-hidden">
      <AchievementsPage variant="embedded" />
    </div>
  );
}
