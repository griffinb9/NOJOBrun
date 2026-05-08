'use client';

import { useEffect, useState } from 'react';
import { Flame, TrendingUp, Target, BadgeCheck, Trophy } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { storage } from '@/lib/storage';
import { getRankProgress } from '@/lib/points';
import { UserProgress } from '@/lib/types';
import SegmentedProgressRing from '@/components/ui/SegmentedProgressRing';

interface Props {
  refreshKey?: number;
}

const RANK_ICON: Record<string, LucideIcon> = {
  'Underdog':      Flame,
  'On the Rise':   TrendingUp,
  'Locked In':     Target,
  'Interview Pro': BadgeCheck,
  'Offer Season':  Trophy,
};

const RANK_CARD_BG: Record<string, string> = {
  'Underdog':      'from-slate-50 to-slate-100/70',
  'On the Rise':   'from-blue-50/60 to-violet-50/50',
  'Locked In':     'from-violet-50/70 to-blue-50/50',
  'Interview Pro': 'from-amber-50/60 to-orange-50/40',
  'Offer Season':  'from-emerald-50/70 to-teal-50/40',
};

const WEEKLY_BAR = 'bg-gradient-to-r from-blue-400 to-violet-500';

export default function RankCard({ refreshKey }: Props) {
  const [progress, setProgress] = useState<UserProgress | null>(null);

  useEffect(() => {
    setProgress(storage.getUserProgress());
  }, [refreshKey]);

  if (!progress) return null;

  const { current, next, pointsToNext } = getRankProgress(progress.totalPoints);
  const weeklyPercent = Math.min(100, Math.round((progress.weeklyPoints / progress.weeklyGoal) * 100));
  const isMaxRank = !next;

  // Compute progress percent for the segmented ring
  const progressPercent = isMaxRank
    ? 100
    : next.minPoints === current.minPoints
    ? 0
    : Math.min(100, Math.max(0,
        ((progress.totalPoints - current.minPoints) / (next.minPoints - current.minPoints)) * 100
      ));

  const RankIcon = RANK_ICON[current.name] ?? Flame;
  const cardBg   = RANK_CARD_BG[current.name] ?? 'from-slate-50 to-slate-100/70';

  return (
    <div
      className={`bg-gradient-to-br ${cardBg} rounded-2xl border border-white/80 overflow-hidden mb-10`}
      style={{
        boxShadow: '0 4px 32px rgba(124,58,237,0.12), 0 1px 6px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.8)',
      }}
    >
      {/* Gradient top strip */}
      <div className="h-[3px] w-full bg-gradient-to-r from-blue-500 to-violet-600" />

      <div className="p-5 md:p-7">
        <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-10">

          {/* ── Segmented ring — hero element ── */}
          <div className="flex justify-center md:justify-start shrink-0">
            <div className="relative">
              <SegmentedProgressRing percent={progressPercent} size={164} segmentCount={32}>
                {/* Center: rank name + points */}
                <div className="flex flex-col items-center justify-center text-center select-none">
                  <span className="text-[9px] font-semibold uppercase tracking-widest text-stone-400 leading-none mb-1.5 truncate max-w-[80px]">
                    {current.name}
                  </span>
                  <span
                    className="text-[26px] font-bold leading-none tabular-nums"
                    style={{ color: isMaxRank ? '#10B981' : '#3B82F6' }}
                  >
                    {progress.totalPoints}
                  </span>
                  <span className="text-[11px] text-stone-400 leading-none mt-0.5">pts</span>
                  {!isMaxRank && progressPercent > 0 && (
                    <span className="text-[9px] text-stone-300 mt-1.5 leading-none tabular-nums">
                      {Math.round(progressPercent)}%
                    </span>
                  )}
                  {isMaxRank && (
                    <span className="text-[9px] mt-1.5 leading-none font-semibold text-emerald-500">
                      max rank
                    </span>
                  )}
                </div>
              </SegmentedProgressRing>

              {/* Rank icon badge — bottom-right of ring */}
              <div
                className={`
                  absolute -bottom-1.5 -right-1.5
                  w-9 h-9 rounded-full border-2 border-white shadow-md
                  flex items-center justify-center
                  ${current.badgeBg}
                `}
              >
                <RankIcon size={15} className={current.badgeText} />
              </div>
            </div>
          </div>

          {/* ── Rank identity ── */}
          <div className="flex-1 min-w-0">
            <span className={`text-[11px] font-semibold uppercase tracking-widest ${current.accentColor}`}>
              Personal Rank
            </span>

            <h2 className="text-2xl font-bold text-stone-900 leading-tight mt-1 tracking-tight">
              {current.name}
            </h2>
            <p className="text-stone-400 text-sm mt-1.5 leading-relaxed">{current.description}</p>

            <div className="mt-4 space-y-1">
              <p className="text-sm text-stone-600">
                You&apos;re currently{' '}
                <span className={`font-semibold ${current.accentColor}`}>{current.name}</span>.
              </p>
              {isMaxRank ? (
                <p className="text-sm text-emerald-600 font-medium">
                  Top tier reached. Keep collecting wins.
                </p>
              ) : (
                <p className="text-sm text-stone-500">
                  <span className="font-semibold bg-gradient-to-r from-blue-500 to-violet-600 bg-clip-text text-transparent">
                    {pointsToNext} pts
                  </span>
                  {' '}to reach{' '}
                  <span className="font-semibold text-stone-700">{next.name}</span>.
                </p>
              )}
            </div>

            {/* Quick point guide */}
            <div className="mt-4 flex items-center gap-5 flex-wrap">
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
            <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-400 mb-3">
              This Week
            </p>

            <div className="flex items-end gap-1.5 mb-2.5">
              <span className="text-3xl font-bold text-stone-900 leading-none tabular-nums">
                {progress.weeklyPoints}
              </span>
              <span className="text-stone-400 text-sm mb-0.5 leading-none">
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

            <p className="text-xs text-stone-400 mt-2">
              {weeklyPercent >= 100
                ? '✓ Goal hit!'
                : `${progress.weeklyGoal - progress.weeklyPoints} pts to go`}
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
