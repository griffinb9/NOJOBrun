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
import AchievementProgressRing from '@/components/ui/AchievementProgressRing';

// Icon per achievement category
const ACHIEVEMENT_ICONS: Record<string, LucideIcon> = {
  jobs_applied:      Send,
  recruiter_screens: PhoneCall,
  interviews:        Mic,
  offers:            Trophy,
  follow_ups:        MailCheck,
  prep_kits:         Sparkles,
  star_stories:      BookOpen,
};

// Category-specific ring + icon colors (hex)
const RING_COLOR: Record<string, { ring: string; icon: string }> = {
  jobs_applied:      { ring: '#3B82F6', icon: '#2563EB' }, // blue
  recruiter_screens: { ring: '#06B6D4', icon: '#0891B2' }, // cyan
  interviews:        { ring: '#7C3AED', icon: '#6D28D9' }, // violet
  offers:            { ring: '#10B981', icon: '#059669' }, // emerald
  follow_ups:        { ring: '#F97316', icon: '#EA580C' }, // orange
  prep_kits:         { ring: '#F59E0B', icon: '#D97706' }, // amber
  star_stories:      { ring: '#F43F5E', icon: '#E11D48' }, // rose
};

function toRoman(num: number): string {
  const map = [
    { value: 10, symbol: 'X' },
    { value: 9,  symbol: 'IX' },
    { value: 5,  symbol: 'V' },
    { value: 4,  symbol: 'IV' },
    { value: 1,  symbol: 'I' },
  ];
  let result = '';
  for (const { value, symbol } of map) {
    while (num >= value) { result += symbol; num -= value; }
  }
  return result;
}

function formatTierName(name: string): string {
  const match = name.match(/^(.*)\s(\d+)$/);
  if (!match) return name;
  return `${match[1]} ${toRoman(parseInt(match[2], 10))}`;
}

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
  const style     = TIER_STYLE[a.currentTier.name];
  const isPlatinum = !a.nextTier;
  const Icon      = ACHIEVEMENT_ICONS[a.id] ?? Trophy;
  const colors    = RING_COLOR[a.id] ?? { ring: '#6366F1', icon: '#4F46E5' };
  const microcopy = getMicrocopy(a.id, a.progressPercent, isPlatinum);

  const nextLabel = isPlatinum
    ? 'Maximum tier reached'
    : `${a.toNextTier} more ${a.toNextTier === 1 ? a.unit : `${a.unit}s`} to ${formatTierName(a.nextTier!.name)}`;

  return (
    <div
      className={`
        group relative bg-white rounded-2xl border border-stone-100
        flex flex-col items-center text-center overflow-hidden
        shadow-[0_2px_8px_rgba(0,0,0,0.06)]
        hover:shadow-[0_8px_24px_rgba(0,0,0,0.10)] hover:-translate-y-0.5
        transition-all duration-200
        border-t-2 ${style.borderTop}
        px-5 pt-7 pb-5 gap-3
      `}
    >
      {/* Tier pill — top right */}
      <span
        className={`absolute top-3.5 right-3.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${style.badge} whitespace-nowrap`}
      >
        {formatTierName(a.currentTier.name)}
      </span>

      {/* Circular progress ring with icon */}
      <AchievementProgressRing
        percent={a.progressPercent}
        color={colors.ring}
        iconColor={colors.icon}
        isPlatinum={isPlatinum}
        Icon={Icon}
        size={100}
      />

      {/* Name */}
      <h3 className="font-semibold text-stone-800 text-sm leading-tight mt-1">{a.name}</h3>

      {/* Microcopy */}
      <p className="text-xs text-stone-400 leading-snug -mt-1">{microcopy}</p>

      {/* Count */}
      <div className="flex items-baseline gap-1.5 mt-0.5">
        <span className="text-4xl font-bold text-stone-900 tabular-nums leading-none">{a.count}</span>
        <span className="text-stone-400 text-sm">
          {a.count === 1 ? a.unit : `${a.unit}s`}
        </span>
      </div>

      {/* Next tier text */}
      <p
        className={`text-xs font-medium mt-auto pt-1 ${
          isPlatinum ? 'text-violet-600' : 'text-stone-400'
        }`}
      >
        {nextLabel}
        {!isPlatinum && (
          <span className={`ml-1.5 font-semibold ${style.accent}`}>
            {a.progressPercent}%
          </span>
        )}
      </p>
    </div>
  );
}
