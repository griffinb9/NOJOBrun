'use client';

import { useEffect, useState } from 'react';
import {
  Send, PhoneCall, Mic, Trophy, MailCheck, Sparkles, BookOpen, Zap, Shield,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { db } from '@/lib/db';
import {
  achievementTierPillText,
  computeAllAchievements,
  ComputedAchievement,
  formatTierNameDisplay,
  TIER_STYLE,
} from '@/lib/achievements';
import AchievementBadge from '@/components/ui/AchievementBadge';

const ACHIEVEMENT_ICONS: Record<string, LucideIcon> = {
  jobs_applied:      Send,
  max_apps_one_day: Zap,
  recruiter_screens: PhoneCall,
  interviews:        Mic,
  offers:            Trophy,
  follow_ups:        MailCheck,
  resilience:       Shield,
  prep_kits:         Sparkles,
  star_stories:      BookOpen,
};

// color = ring/glow accent, light = gradient endpoint on ring
const BADGE_COLORS: Record<string, { color: string; light: string }> = {
  jobs_applied:      { color: '#3B82F6', light: '#60A5FA' }, // blue
  max_apps_one_day:  { color: '#D97706', light: '#FBBF24' }, // amber / gold
  recruiter_screens: { color: '#8B5CF6', light: '#A78BFA' }, // purple
  interviews:        { color: '#F43F5E', light: '#FB7185' }, // red-pink
  offers:            { color: '#10B981', light: '#34D399' }, // emerald
  follow_ups:        { color: '#F59E0B', light: '#FCD34D' }, // amber
  resilience:        { color: '#DC2626', light: '#FB923C' }, // ember / amber glow
  prep_kits:         { color: '#7C3AED', light: '#A78BFA' }, // violet
  star_stories:      { color: '#14B8A6', light: '#2DD4BF' }, // teal
};

function getMicrocopy(id: string, progressPercent: number, isPlatinum: boolean): string {
  if (isPlatinum) {
    if (id === 'resilience') return 'You kept showing up. That is the whole game.';
    return 'Platinum tier — fully unlocked.';
  }

  const tables: Record<string, [string, string, string, string]> = {
    jobs_applied:      ['Start sending. Volume builds luck.', 'Keep the streak alive.', 'Consistency is the cheat code.', 'Apps don\'t apply themselves.'],
    max_apps_one_day:  ['One focused day can move the needle.', 'Stack reps when you\'re in the zone.', 'High output, high reward.', 'Blitz mode: unlocked.'],
    recruiter_screens: ['Getting on their radar.', 'Past the initial filter.', 'Screens are a skill too.', 'Making the shortlist.'],
    interviews:        ['Your first interview is closer than you think.', 'Each rep sharpens the edge.', 'Getting comfortable in the room.', 'Almost in interview machine mode.'],
    offers:            ['Offer energy loading...', 'One offer changes everything.', 'Turning interviews into offers.', 'You\'re entering offer season.'],
    follow_ups:        ['The follow-up is the differentiator.', 'Persistent, not desperate.', 'Following up closes the loop.', 'Never ghosting back.'],
    prep_kits:         ['Prep is an unfair advantage.', 'Walking in confident.', 'The work happens before the call.', 'Overprepared is the only prepared.'],
    star_stories:      ['Stories win interviews.', 'Your story bank is growing.', 'Ready for any behavioral.', 'Every story is a weapon.'],
    resilience:        ['Showing up is half the win.', 'Every no sharpens your pitch.', 'Volume turns setbacks into data.', 'You keep going — that is the edge.'],
  };

  const pool = tables[id] ?? ['Keep going.', 'Building momentum.', 'Almost there.', 'So close.'];
  const idx = progressPercent >= 75 ? 3 : progressPercent >= 50 ? 2 : progressPercent >= 20 ? 1 : 0;
  return pool[Math.min(idx, pool.length - 1)];
}

export default function AchievementsPage({ variant = 'default' }: { variant?: 'default' | 'embedded' }) {
  const [achievements, setAchievements] = useState<ComputedAchievement[]>([]);
  const embedded = variant === 'embedded';

  useEffect(() => {
    async function load() {
      await db.syncPublicGamificationSnapshot();
      const [jobs, pointEvents, stories] = await Promise.all([
        db.getJobs(),
        db.getPointEvents(),
        db.getStories(),
      ]);
      setAchievements(computeAllAchievements({ jobs, pointEvents, stories }));
    }
    load();
  }, []);

  const earned = achievements.filter((a) => a.count > 0).length;

  return (
    <div
      className={
        embedded
          ? 'p-4 pb-6 max-w-full mx-auto w-full overflow-x-hidden'
          : 'p-6 md:p-10 max-w-5xl mx-auto w-full'
      }
    >
      {/* Header */}
      <div
        className={
          embedded
            ? 'flex flex-wrap items-end justify-between mb-4 gap-3'
            : 'flex flex-wrap items-end justify-between mb-6 md:mb-10 gap-4'
        }
      >
        <div>
          <h1 className={embedded ? 'text-xl font-bold text-stone-900 tracking-tight' : 'text-2xl md:text-3xl font-bold text-stone-900 tracking-tight'}>
            Achievements
          </h1>
          <p className={`text-stone-400 ${embedded ? 'text-xs mt-1' : 'text-sm mt-2'}`}>
            Milestone badges earned across your job search.
          </p>
        </div>
        {achievements.length > 0 && (
          <div className="shrink-0 text-right">
            <div className={embedded ? 'text-xl font-bold text-stone-900 tabular-nums leading-none' : 'text-2xl font-bold text-stone-900 tabular-nums leading-none'}>
              {earned}
            </div>
            <div className="text-xs text-stone-400 mt-1">of {achievements.length} started</div>
          </div>
        )}
      </div>

      {/* Grid */}
      <div className={embedded ? 'grid grid-cols-1 gap-2.5 w-full' : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'}>
        {achievements.map((a) => (
          <AchievementCard key={a.id} achievement={a} compact={embedded} />
        ))}
      </div>
    </div>
  );
}

function AchievementCard({ achievement: a, compact = false }: { achievement: ComputedAchievement; compact?: boolean }) {
  const style      = TIER_STYLE[a.currentTier.name] ?? TIER_STYLE['Bronze 1'];
  const isPlatinum = !a.nextTier;
  const Icon       = ACHIEVEMENT_ICONS[a.id] ?? Trophy;
  const palette    = BADGE_COLORS[a.id] ?? { color: '#6366F1', light: '#818CF8' };
  const microcopy  = getMicrocopy(a.id, a.progressPercent, isPlatinum);

  const nextLabel = isPlatinum
    ? 'Maximum tier reached'
    : `${a.toNextTier} more ${a.toNextTier === 1 ? a.unit : `${a.unit}s`} to ${formatTierNameDisplay(a.nextTier!.name)}`;

  const countLabel = a.id === 'max_apps_one_day' ? 'Personal best (one day)' : null;

  return (
    <div
      className={`
        group relative flex flex-col items-center text-center max-w-full
        bg-white rounded-2xl border border-stone-100 overflow-hidden
        shadow-[0_2px_12px_rgba(0,0,0,0.07)]
        ${compact ? '' : 'hover:shadow-[0_12px_32px_rgba(0,0,0,0.13)] hover:-translate-y-1'}
        transition-all duration-250
        border-t-[3px] ${style.borderTop}
        ${a.id === 'max_apps_one_day' ? 'ring-1 ring-amber-200/70 shadow-[0_2px_12px_rgba(245,158,11,0.08)]' : ''}
        ${a.id === 'resilience' ? 'ring-1 ring-orange-200/80 shadow-[0_2px_16px_rgba(234,88,12,0.12)]' : ''}
        ${compact ? 'px-4 pt-6 pb-4 gap-0' : 'px-5 pt-8 pb-6 gap-0'}
      `}
    >
      {/* Tier pill — top right */}
      <span
        className={`absolute ${compact ? 'top-2.5 right-2.5 text-[10px] px-2 py-0.5' : 'top-3.5 right-3.5 text-xs px-2.5 py-1'} font-semibold rounded-full border ${style.badge} whitespace-nowrap`}
      >
        {achievementTierPillText(a)}
      </span>

      {/* Badge — focal centrepiece */}
      <AchievementBadge
        percent={a.progressPercent}
        color={palette.color}
        lightColor={palette.light}
        isPlatinum={isPlatinum}
        Icon={Icon}
        size={compact ? 92 : 124}
      />

      {/* Achievement name */}
      <h3 className={`font-bold text-stone-800 leading-snug px-2 ${compact ? 'text-xs mt-2' : 'text-sm mt-4'}`}>{a.name}</h3>

      {a.id === 'max_apps_one_day' && (
        <p className={`text-amber-700/90 font-medium leading-snug mt-1 px-2 ${compact ? 'text-[10px]' : 'text-[11px]'}`}>{a.description}</p>
      )}
      {a.id === 'resilience' && (
        <p className={`text-orange-800/85 font-medium leading-snug mt-1 px-2 ${compact ? 'text-[10px]' : 'text-[11px]'}`}>{a.description}</p>
      )}

      {/* Microcopy */}
      <p className={`text-stone-400 leading-snug mt-1 px-2 ${compact ? 'text-[10px] line-clamp-2' : 'text-xs'}`}>{microcopy}</p>

      {/* Count */}
      <div className={`flex flex-col items-center gap-1 ${compact ? 'mt-2' : 'mt-4'}`}>
        {countLabel && (
          <span className={`font-semibold uppercase tracking-wide text-amber-800/80 ${compact ? 'text-[9px]' : 'text-[10px]'}`}>{countLabel}</span>
        )}
        <div className="flex items-baseline gap-1.5">
          <span className={`font-bold text-stone-900 tabular-nums leading-none ${compact ? 'text-2xl' : 'text-4xl'}`}>{a.count}</span>
          <span className={`text-stone-400 leading-none ${compact ? 'text-xs' : 'text-sm'}`}>
            {a.count === 1 ? a.unit : `${a.unit}s`}
          </span>
        </div>
      </div>

      {/* Progress / next tier */}
      <div className={`mt-auto w-full border-t border-stone-50 ${compact ? 'pt-2 mt-2' : 'pt-4 mt-4'}`}>
        <p className={`font-medium ${compact ? 'text-[10px]' : 'text-xs'} ${isPlatinum ? 'text-violet-600' : 'text-stone-400'}`}>
          {nextLabel}
          {!isPlatinum && (
            <span className={`${compact ? 'ml-1' : 'ml-1.5'} font-bold ${style.accent}`}>
              {a.progressPercent}%
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
