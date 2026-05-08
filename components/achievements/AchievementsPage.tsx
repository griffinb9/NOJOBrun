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
import AchievementBadge from '@/components/ui/AchievementBadge';

const ACHIEVEMENT_ICONS: Record<string, LucideIcon> = {
  jobs_applied:      Send,
  recruiter_screens: PhoneCall,
  interviews:        Mic,
  offers:            Trophy,
  follow_ups:        MailCheck,
  prep_kits:         Sparkles,
  star_stories:      BookOpen,
};

// color = ring/glow accent, light = gradient endpoint on ring
const BADGE_COLORS: Record<string, { color: string; light: string }> = {
  jobs_applied:      { color: '#3B82F6', light: '#60A5FA' }, // blue
  recruiter_screens: { color: '#8B5CF6', light: '#A78BFA' }, // purple
  interviews:        { color: '#F43F5E', light: '#FB7185' }, // red-pink
  offers:            { color: '#10B981', light: '#34D399' }, // emerald
  follow_ups:        { color: '#F59E0B', light: '#FCD34D' }, // amber
  prep_kits:         { color: '#7C3AED', light: '#A78BFA' }, // violet
  star_stories:      { color: '#14B8A6', light: '#2DD4BF' }, // teal
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
  const style      = TIER_STYLE[a.currentTier.name];
  const isPlatinum = !a.nextTier;
  const Icon       = ACHIEVEMENT_ICONS[a.id] ?? Trophy;
  const palette    = BADGE_COLORS[a.id] ?? { color: '#6366F1', light: '#818CF8' };
  const microcopy  = getMicrocopy(a.id, a.progressPercent, isPlatinum);

  const nextLabel = isPlatinum
    ? 'Maximum tier reached'
    : `${a.toNextTier} more ${a.toNextTier === 1 ? a.unit : `${a.unit}s`} to ${formatTierName(a.nextTier!.name)}`;

  return (
    <div
      className={`
        group relative flex flex-col items-center text-center
        bg-white rounded-2xl border border-stone-100 overflow-hidden
        shadow-[0_2px_12px_rgba(0,0,0,0.07)]
        hover:shadow-[0_12px_32px_rgba(0,0,0,0.13)] hover:-translate-y-1
        transition-all duration-250
        border-t-[3px] ${style.borderTop}
        px-5 pt-8 pb-6 gap-0
      `}
    >
      {/* Tier pill — top right */}
      <span
        className={`absolute top-3.5 right-3.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${style.badge} whitespace-nowrap`}
      >
        {formatTierName(a.currentTier.name)}
      </span>

      {/* Badge — focal centrepiece */}
      <AchievementBadge
        percent={a.progressPercent}
        color={palette.color}
        lightColor={palette.light}
        isPlatinum={isPlatinum}
        Icon={Icon}
        size={124}
      />

      {/* Achievement name */}
      <h3 className="font-bold text-stone-800 text-sm leading-snug mt-4 px-2">{a.name}</h3>

      {/* Microcopy */}
      <p className="text-xs text-stone-400 leading-snug mt-1 px-2">{microcopy}</p>

      {/* Count */}
      <div className="flex items-baseline gap-1.5 mt-4">
        <span className="text-4xl font-bold text-stone-900 tabular-nums leading-none">{a.count}</span>
        <span className="text-stone-400 text-sm leading-none">
          {a.count === 1 ? a.unit : `${a.unit}s`}
        </span>
      </div>

      {/* Progress / next tier */}
      <div className="mt-auto pt-4 w-full border-t border-stone-50 mt-4">
        <p className={`text-xs font-medium ${isPlatinum ? 'text-violet-600' : 'text-stone-400'}`}>
          {nextLabel}
          {!isPlatinum && (
            <span className={`ml-1.5 font-bold ${style.accent}`}>
              {a.progressPercent}%
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
