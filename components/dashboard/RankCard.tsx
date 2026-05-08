'use client';

import { useEffect, useState } from 'react';
import { Flame, TrendingUp, Target, BadgeCheck, Trophy, Rocket, Mic, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { storage } from '@/lib/storage';
import { getRankProgress } from '@/lib/points';
import { UserProgress } from '@/lib/types';
import SegmentedProgressRing from '@/components/ui/SegmentedProgressRing';

interface Props {
  refreshKey?: number;
}

const RANK_META: Record<string, { icon: LucideIcon; cardBg: string; stripFrom: string; stripTo: string }> = {
  'Underdog':      { icon: Rocket,     cardBg: 'from-slate-50 to-slate-100/60',      stripFrom: 'from-slate-400',   stripTo: 'to-blue-400'   },
  'On the Rise':   { icon: TrendingUp, cardBg: 'from-blue-50/60 to-violet-50/50',    stripFrom: 'from-blue-500',    stripTo: 'to-violet-500' },
  'Locked In':     { icon: Target,     cardBg: 'from-violet-50/70 to-blue-50/50',    stripFrom: 'from-violet-500',  stripTo: 'to-blue-500'   },
  'Interview Pro': { icon: Mic,        cardBg: 'from-amber-50/60 to-orange-50/40',   stripFrom: 'from-amber-400',   stripTo: 'to-orange-400' },
  'Offer Season':  { icon: Sparkles,   cardBg: 'from-emerald-50/70 to-teal-50/40',  stripFrom: 'from-emerald-400', stripTo: 'to-teal-400'   },
};

const WEEKLY_BAR = 'bg-gradient-to-r from-blue-400 to-violet-500';

function weeklyTagline(percent: number): string {
  if (percent >= 100) return 'Weekly goal crushed.';
  if (percent >= 75)  return 'Almost at the goal — push it.';
  if (percent >= 50)  return 'Halfway through. Keep stacking.';
  if (percent >= 25)  return 'Momentum building.';
  return 'Start the weekly streak.';
}

export default function RankCard({ refreshKey }: Props) {
  const [progress, setProgress] = useState<UserProgress | null>(null);

  useEffect(() => {
    setProgress(storage.getUserProgress());
  }, [refreshKey]);

  if (!progress) return null;

  const { current, next, pointsToNext } = getRankProgress(progress.totalPoints);
  const weeklyPercent = Math.min(100, Math.round((progress.weeklyPoints / progress.weeklyGoal) * 100));
  const isMaxRank = !next;

  const progressPercent = isMaxRank
    ? 100
    : next.minPoints === current.minPoints
    ? 0
    : Math.min(100, Math.max(0,
        ((progress.totalPoints - current.minPoints) / (next.minPoints - current.minPoints)) * 100
      ));

  const meta   = RANK_META[current.name] ?? RANK_META['Underdog'];
  const RankIcon = meta.icon;

  // Motivating copy for progress line
  const progressLine = (() => {
    if (isMaxRank) return 'Top rank reached. Keep stacking wins.';
    if (progress.totalPoints === 0) return `Earn ${next.minPoints} pts to unlock ${next.name}.`;
    return `${pointsToNext} pts to unlock ${next.name}.`;
  })();

  return (
    <div
      className={`
        group relative bg-gradient-to-br ${meta.cardBg}
        rounded-2xl border border-white/80 overflow-hidden mb-10
        hover:-translate-y-1 transition-all duration-200 cursor-default
      `}
      style={{
        boxShadow: '0 4px 24px rgba(124,58,237,0.10), 0 1px 4px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.85)',
      }}
    >
      {/* Gradient top strip — rank-tinted */}
      <div className={`h-[3px] w-full bg-gradient-to-r ${meta.stripFrom} ${meta.stripTo}`} />

      <div className="p-5 md:p-7">
        <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-10">

          {/* ── Segmented ring ── */}
          <div className="flex justify-center md:justify-start shrink-0">
            {/* Hover slightly brightens the whole ring area */}
            <div className="transition-all duration-200 group-hover:brightness-110">
              <SegmentedProgressRing percent={progressPercent} size={168} segmentCount={32}>
                {/* Badge plate — subtle frosted inner circle */}
                <div
                  className="flex flex-col items-center justify-center text-center select-none rounded-full px-3 py-3"
                  style={{
                    background: 'radial-gradient(circle at 50% 40%, rgba(255,255,255,0.92), rgba(248,250,252,0.80))',
                    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)',
                    minWidth: 88,
                    minHeight: 88,
                  }}
                >
                  <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400 leading-none mb-1.5 truncate max-w-[76px]">
                    {current.name}
                  </span>
                  {/* Gradient points number */}
                  <span
                    className="font-black leading-none tabular-nums bg-gradient-to-br from-blue-500 to-violet-600 bg-clip-text text-transparent"
                    style={{ fontSize: '2.05rem' }}
                  >
                    {progress.totalPoints}
                  </span>
                  <span className="text-[11px] font-medium text-slate-400 leading-none mt-0.5">pts</span>
                  {!isMaxRank && progressPercent > 0 && (
                    <span className="text-[9px] text-slate-300 mt-1.5 leading-none tabular-nums">
                      {Math.round(progressPercent)}%
                    </span>
                  )}
                  {isMaxRank && (
                    <span className="text-[9px] mt-1.5 leading-none font-bold text-emerald-500 tracking-wide">
                      MAX
                    </span>
                  )}
                </div>
              </SegmentedProgressRing>
            </div>
          </div>

          {/* ── Rank identity ── */}
          <div className="flex-1 min-w-0">

            {/* Rank label chip */}
            <div className="inline-flex items-center gap-1.5 mb-2">
              <RankIcon
                size={11}
                className={current.accentColor}
                strokeWidth={2.5}
              />
              <span className={`text-[11px] font-bold uppercase tracking-widest ${current.accentColor}`}>
                Personal Rank
              </span>
            </div>

            {/* Rank name — styled as a status title */}
            <h2 className="text-2xl font-black text-stone-900 leading-tight tracking-tight">
              {current.name}
            </h2>
            <p className="text-stone-400 text-sm mt-1.5 leading-relaxed">{current.description}</p>

            {/* Progress line */}
            <div className="mt-4">
              {isMaxRank ? (
                <p className="text-sm text-emerald-600 font-semibold">{progressLine}</p>
              ) : (
                <p className="text-sm text-stone-500">
                  <span className="font-bold bg-gradient-to-r from-blue-500 to-violet-600 bg-clip-text text-transparent">
                    {pointsToNext} pts
                  </span>
                  {' '}
                  <span>to unlock </span>
                  <span className="font-semibold text-stone-700">{next.name}</span>
                  <span className="text-stone-400"> →</span>
                </p>
              )}
            </div>

            {/* Quick point guide */}
            <div className="mt-4 flex items-center gap-4 flex-wrap">
              {QUICK_TIPS.map(({ label, pts }) => (
                <div key={label} className="flex items-center gap-1">
                  <span className="text-xs font-bold bg-gradient-to-r from-blue-500 to-violet-600 bg-clip-text text-transparent">
                    +{pts}
                  </span>
                  <span className="text-xs text-stone-400">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="hidden md:block w-px bg-stone-200/60 self-stretch" />

          {/* ── Weekly momentum ── */}
          <div className="md:w-40 shrink-0">
            <p className="text-[11px] font-bold uppercase tracking-widest text-stone-400 mb-3">
              This Week
            </p>

            <div className="flex items-end gap-1.5 mb-2.5">
              <span className="text-3xl font-black text-stone-900 leading-none tabular-nums">
                {progress.weeklyPoints}
              </span>
              <span className="text-stone-400 text-sm mb-0.5 leading-none font-medium">
                / {progress.weeklyGoal} pts
              </span>
            </div>

            <div className="h-1.5 bg-white/70 rounded-full overflow-hidden border border-stone-100">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  weeklyPercent >= 100 ? 'bg-emerald-400' : WEEKLY_BAR
                }`}
                style={{ width: `${weeklyPercent}%` }}
              />
            </div>

            <p className="text-xs text-stone-400 mt-2 leading-snug">
              {weeklyPercent >= 100
                ? <span className="text-emerald-600 font-semibold">Weekly goal crushed.</span>
                : weeklyTagline(weeklyPercent)
              }
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}

const QUICK_TIPS = [
  { label: 'Apply',     pts: 5   },
  { label: 'Screen',    pts: 15  },
  { label: 'Interview', pts: 25  },
  { label: 'Offer',     pts: 100 },
];
