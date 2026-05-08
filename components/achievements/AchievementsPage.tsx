'use client';

import { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { storage } from '@/lib/storage';
import {
  computeAllAchievements,
  ComputedAchievement,
  TIER_STYLE,
} from '@/lib/achievements';

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<ComputedAchievement[]>([]);

  useEffect(() => {
    setAchievements(
      computeAllAchievements({
        jobs: storage.getJobs(),
        pointEvents: storage.getPointEvents(),
        stories: storage.getStories(),
      })
    );
  }, []);

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-stone-800">Achievements</h1>
        <p className="text-stone-400 text-sm mt-0.5">
          Milestone badges earned across your job search journey.
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {achievements.map((a) => (
          <AchievementCard key={a.id} achievement={a} />
        ))}
      </div>
    </div>
  );
}

function AchievementCard({ achievement: a }: { achievement: ComputedAchievement }) {
  const style = TIER_STYLE[a.currentTier.name];
  const isPlatinum = !a.nextTier;

  const nextText = () => {
    if (isPlatinum) return null;
    const n = a.toNextTier!;
    const unit = n === 1 ? a.unit : `${a.unit}s`;
    return `${n} more ${unit} until ${a.nextTier!.name}`;
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 flex flex-col gap-4">
      {/* Top row: name + tier badge */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Trophy size={14} className={style.accent} />
            <h3 className="font-semibold text-stone-800 text-sm">{a.name}</h3>
          </div>
          <p className="text-xs text-stone-400 leading-snug">{a.description}</p>
        </div>
        <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full border whitespace-nowrap ${style.badge}`}>
          {a.currentTier.name}
        </span>
      </div>

      {/* Count */}
      <div className="flex items-end gap-2">
        <span className="text-4xl font-bold text-stone-800 leading-none">{a.count}</span>
        <span className="text-stone-400 text-sm mb-1 leading-none">
          {a.count === 1 ? a.unit : `${a.unit}s`}
        </span>
      </div>

      {/* Progress toward next tier */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-stone-400">
            {isPlatinum ? 'Maximum tier reached' : nextText()}
          </span>
          {!isPlatinum && (
            <span className={`text-xs font-semibold ${style.accent}`}>
              {a.progressPercent}%
            </span>
          )}
        </div>
        <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${style.bar} ${isPlatinum ? 'opacity-60' : ''}`}
            style={{ width: `${isPlatinum ? 100 : a.progressPercent}%` }}
          />
        </div>
        {!isPlatinum && (
          <div className="flex justify-between mt-1">
            <span className="text-xs text-stone-300">{a.currentTier.name}</span>
            <span className="text-xs text-stone-300">{a.nextTier!.name}</span>
          </div>
        )}
      </div>
    </div>
  );
}
