'use client';

import { useEffect, useState } from 'react';
import {
  Send, PhoneCall, Mic, Trophy, MailCheck, Sparkles, BookOpen,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { storage } from '@/lib/storage';
import {
  computeAllAchievements,
  ComputedAchievement,
  TIER_STYLE,
} from '@/lib/achievements';

const ACHIEVEMENT_ICONS: Record<string, LucideIcon> = {
  jobs_applied:      Send,
  recruiter_screens: PhoneCall,
  interviews:        Mic,
  offers:            Trophy,
  follow_ups:        MailCheck,
  prep_kits:         Sparkles,
  star_stories:      BookOpen,
};

function getMicrocopy(id: string, progressPercent: number, isPlatinum: boolean): string {
  if (isPlatinum) return 'Legend status. Fully unlocked.';

  const tables: Record<string, [string, string, string, string]> = {
    jobs_applied:      ['Start sending. Volume builds luck.', 'Keep the streak alive.', 'Consistency is the cheat code.', 'Apps don\'t apply themselves.'],
    recruiter_screens: ['Getting on their radar.', 'Past the initial filter.', 'Screens are a skill too.', 'Making the shortlist.'],
    interviews:        ['Your first interview is closer than you think.', 'Each rep sharpens the edge.', 'Getting comfortable in the room.', 'Almost in interview machine mode.'],
    offers:            ['Offer energy loading...', 'One offer changes everything.', 'Turning interviews into offers.', 'You\'re entering offer season.'],
    follow_ups:        ['The follow-up is the differentiator.', 'Persistent, not desperate.', 'Following up closes the loop.', 'Never ghosting back.'],
    prep_kits:         ['Prep is an unfair advantage.', 'Walking in confident.', 'The work happens before the call.', 'Overprepared is the only prepared.'],
    star_stories:      ['Stories win interviews.', 'Your story bank is growing.', 'Ready for any behavioral.', 'Every story is a weapon.'],
  };

  const pool = tables[id] ?? ['Keep going.', 'Building momentum.', 'Almost there.', 'So close.'];
  const idx = progressPercent >= 75 ? 3 : progressPercent >= 50 ? 2 : progressPercent >= 20 ? 1 : 0;
  return pool[Math.min(idx, pool.length - 1)];
}

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

  const earned = achievements.filter((a) => a.count > 0).length;

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-end justify-between mb-10 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Achievements</h1>
          <p className="text-stone-400 text-sm mt-2">
            Milestone badges earned across your job search.
          </p>
        </div>
        {achievements.length > 0 && (
          <div className="shrink-0 text-right">
            <div className="text-2xl font-bold text-stone-900 tabular-nums leading-none">{earned}</div>
            <div className="text-xs text-stone-400 mt-1">of {achievements.length} started</div>
          </div>
        )}
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
  const Icon = ACHIEVEMENT_ICONS[a.id] ?? Trophy;
  const microcopy = getMicrocopy(a.id, a.progressPercent, isPlatinum);

  const nextLabel = isPlatinum
    ? null
    : `${a.toNextTier} more ${a.toNextTier === 1 ? a.unit : `${a.unit}s`} to ${a.nextTier!.name}`;

  return (
    <div
      className={`
        group relative bg-white rounded-2xl border border-stone-100 shadow-sm
        flex flex-col overflow-hidden
        hover:shadow-md hover:-translate-y-0.5 transition-all duration-200
        border-t-2 ${style.borderTop}
      `}
    >
      <div className="p-5 flex flex-col gap-4 flex-1">

        {/* Top row: icon badge + tier pill */}
        <div className="flex items-start justify-between gap-3">
          <div className={`p-2.5 rounded-xl ${style.iconBg} shrink-0`}>
            <Icon size={18} className={style.iconColor} />
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${style.badge} whitespace-nowrap`}>
            {a.currentTier.name}
          </span>
        </div>

        {/* Name + microcopy */}
        <div>
          <h3 className="font-semibold text-stone-800 text-sm leading-tight">{a.name}</h3>
          <p className="text-xs text-stone-400 mt-1 leading-snug">{microcopy}</p>
        </div>

        {/* Count */}
        <div className="flex items-baseline gap-1.5">
          <span className="text-4xl font-bold text-stone-900 tabular-nums leading-none">{a.count}</span>
          <span className="text-stone-400 text-sm">
            {a.count === 1 ? a.unit : `${a.unit}s`}
          </span>
        </div>

        {/* Progress */}
        <div className="mt-auto">
          {isPlatinum ? (
            <div>
              <div className="h-2 rounded-full bg-violet-500 opacity-80 mb-1.5" />
              <p className="text-xs text-violet-600 font-medium">Maximum tier reached</p>
            </div>
          ) : (
            <div>
              <div className="h-2 bg-stone-100 rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${style.bar}`}
                  style={{ width: `${a.progressPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-stone-400">{nextLabel}</span>
                <span className={`text-xs font-semibold ${style.accent}`}>{a.progressPercent}%</span>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
