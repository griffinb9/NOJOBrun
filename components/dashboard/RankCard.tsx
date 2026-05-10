'use client';

import { useEffect, useState } from 'react';
import {
  TrendingUp,
  Target,
  Trophy,
  Rocket,
  Mic,
  Sparkles,
  Send,
  PhoneCall,
  Zap,
  Flame,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { db } from '@/lib/db';
import { getRankProgress } from '@/lib/points';
import { UserProgress } from '@/lib/types';
import type { JobStreakSummary } from '@/lib/job-streak';
import SegmentedProgressRing from '@/components/ui/SegmentedProgressRing';

interface Props {
  refreshKey?: number;
  streakSummary: JobStreakSummary;
}

const RANK_META: Record<string, { icon: LucideIcon; badgeClass: string }> = {
  'Underdog':      { icon: Rocket,     badgeClass: 'border border-slate-200/90 bg-slate-100/90 text-slate-800 shadow-sm shadow-slate-900/8 ring-1 ring-white/60' },
  'On the Rise':   { icon: TrendingUp, badgeClass: 'border border-blue-300/85 bg-gradient-to-r from-blue-50/98 to-indigo-50/90 text-blue-950 shadow-md shadow-blue-500/12 ring-1 ring-blue-200/50' },
  'Locked In':     { icon: Target,     badgeClass: 'border border-indigo-300/80 bg-gradient-to-r from-indigo-50/98 to-violet-50/85 text-indigo-950 shadow-md shadow-indigo-500/15 ring-1 ring-indigo-200/55' },
  'Interview Pro': { icon: Mic,        badgeClass: 'border border-amber-300/75 bg-amber-50/95 text-amber-950 shadow-md shadow-amber-500/12 ring-1 ring-amber-200/50' },
  'Offer Season':  { icon: Sparkles,   badgeClass: 'border border-emerald-300/75 bg-emerald-50/95 text-emerald-950 shadow-md shadow-emerald-500/12 ring-1 ring-emerald-200/50' },
};

const POINT_BADGES: { label: string; pts: number; icon: LucideIcon }[] = [
  { label: 'Apply', pts: 5, icon: Send },
  { label: 'Screen', pts: 15, icon: PhoneCall },
  { label: 'Interview', pts: 25, icon: Mic },
  { label: 'Offer', pts: 100, icon: Trophy },
];

export default function RankCard({ refreshKey, streakSummary }: Props) {
  const [progress, setProgress] = useState<UserProgress | null>(null);

  useEffect(() => {
    db.getUserProgress().then(setProgress);
  }, [refreshKey]);

  if (!progress) return null;

  const { current, next, pointsToNext } = getRankProgress(progress.totalPoints);
  const isMaxRank = !next;
  const { currentStreak, longestStreak, appliedToday } = streakSummary;

  const streakLabel =
    currentStreak === 0 ? '0 days' : currentStreak === 1 ? '1 day' : `${currentStreak} days`;
  const bestLine =
    longestStreak === 0
      ? null
      : longestStreak === 1
        ? 'Best: 1 day'
        : `Best: ${longestStreak} days`;

  const progressPercent = isMaxRank
    ? 100
    : next.minPoints === current.minPoints
    ? 0
    : Math.min(100, Math.max(0,
        ((progress.totalPoints - current.minPoints) / (next.minPoints - current.minPoints)) * 100
      ));

  const meta = RANK_META[current.name] ?? RANK_META['Underdog'];
  const RankIcon = meta.icon;

  const progressLine = (() => {
    if (isMaxRank) return 'Top rank reached. Keep stacking wins.';
    if (progress.totalPoints === 0) return `Earn ${next.minPoints} pts to unlock ${next.name}.`;
    return `${pointsToNext} pts to unlock ${next.name}.`;
  })();

  return (
    <div
      className="group relative mb-10 overflow-hidden rounded-3xl border border-white/50 bg-gradient-to-br from-[#ccd6eb] via-[#c2cfe8] to-[#b4c4e0] p-1 shadow-[0_24px_56px_-14px_rgba(30,27,75,0.13),0_0_0_1px_rgba(255,255,255,0.58)_inset] ring-1 ring-indigo-950/[0.06] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_28px_60px_-12px_rgba(49,46,129,0.18)]"
    >
      <div className="pointer-events-none absolute -left-16 -top-12 h-44 w-56 rounded-full bg-indigo-500/[0.15] blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -right-12 bottom-0 h-36 w-44 rounded-full bg-sky-500/[0.13] blur-3xl" aria-hidden />

      <div className="relative p-5 md:p-7">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:gap-10">

          <div className="flex shrink-0 justify-center lg:justify-start">
            <div className="transition-all duration-300 group-hover:[filter:brightness(1.02)]">
              <SegmentedProgressRing percent={progressPercent} size={172} segmentCount={32} variant="light">
                <div
                  className="flex flex-col items-center justify-center rounded-full px-3 py-3 text-center select-none"
                  style={{
                    background: 'linear-gradient(165deg, rgba(255,255,255,0.97), rgba(241,245,253,0.9))',
                    boxShadow:
                      'inset 0 1px 0 rgba(255,255,255,0.96), 0 10px 36px rgba(30,27,75,0.1), 0 0 28px rgba(99,102,241,0.08), 0 0 0 1px rgba(255,255,255,0.45)',
                    minWidth: 92,
                    minHeight: 92,
                  }}
                >
                  <span className="mb-1 max-w-[80px] truncate text-[9px] font-bold uppercase leading-none tracking-[0.14em] text-slate-500">
                    Rank
                  </span>
                  <span
                    className="font-black leading-none tabular-nums tracking-tight bg-gradient-to-br from-slate-900 via-indigo-700 to-violet-900 bg-clip-text text-transparent drop-shadow-[0_1px_2px_rgba(15,23,42,0.12),0_0_24px_rgba(99,102,241,0.18)]"
                    style={{ fontSize: '2.45rem' }}
                  >
                    {progress.totalPoints}
                  </span>
                  <span className="mt-0.5 text-[11px] font-medium leading-none text-slate-500">pts</span>
                  {!isMaxRank && progressPercent > 0 && (
                    <span className="mt-1.5 text-[9px] leading-none tabular-nums text-slate-500">
                      {Math.round(progressPercent)}%
                    </span>
                  )}
                  {isMaxRank && (
                    <span className="mt-1.5 text-[9px] font-bold leading-none tracking-wide text-emerald-600">
                      MAX
                    </span>
                  )}
                </div>
              </SegmentedProgressRing>
            </div>
          </div>

          <div className="min-w-0 flex-1 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold tracking-tight ${meta.badgeClass}`}
              >
                <RankIcon size={16} strokeWidth={2.2} className="shrink-0 opacity-90" />
                {current.name}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200/70 bg-white/75 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-700 shadow-sm shadow-indigo-500/10 ring-1 ring-indigo-100/80 backdrop-blur-sm">
                <Zap size={11} className="text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.35)]" />
                Personal rank
              </span>
            </div>

            <p className="text-sm leading-relaxed text-slate-700">{current.description}</p>

            <div>
              {isMaxRank ? (
                <p className="text-sm font-semibold text-emerald-700">{progressLine}</p>
              ) : (
                <p className="text-sm text-slate-700">
                  <span className="font-bold bg-gradient-to-r from-sky-600 via-indigo-600 to-violet-700 bg-clip-text text-transparent drop-shadow-[0_0_14px_rgba(59,130,246,0.2)]">
                    {pointsToNext} pts
                  </span>
                  {' '}
                  <span>to unlock </span>
                  <span className="font-semibold text-slate-800">{next.name}</span>
                  <span className="text-slate-400"> →</span>
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {POINT_BADGES.map(({ label, pts, icon: Icon }) => (
                <div
                  key={label}
                  className="inline-flex items-center gap-2 rounded-xl border border-indigo-200/55 bg-white/60 px-2.5 py-1.5 shadow-sm shadow-indigo-500/8 backdrop-blur-sm transition-all duration-200 hover:border-indigo-400/65 hover:bg-white/85 hover:shadow-md hover:shadow-indigo-500/12"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-200/90 via-violet-100/80 to-slate-100/90 text-indigo-900 shadow-sm shadow-indigo-500/15">
                    <Icon size={14} strokeWidth={2} />
                  </span>
                  <span className="text-[11px] font-bold tabular-nums bg-gradient-to-r from-sky-600 to-indigo-700 bg-clip-text text-transparent">+{pts}</span>
                  <span className="text-[11px] font-medium text-slate-600">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="hidden w-px shrink-0 self-stretch bg-gradient-to-b from-transparent via-indigo-300/35 to-transparent lg:block" />

          <div className="shrink-0 rounded-2xl border border-indigo-200/45 bg-white/55 p-3.5 shadow-[0_12px_32px_-10px_rgba(49,46,129,0.14),0_0_0_1px_rgba(255,255,255,0.65)_inset] backdrop-blur-md lg:w-[13.25rem]">
            <div className="mb-2.5 flex items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-200/95 to-orange-200/80 text-orange-600 shadow-md shadow-orange-500/25 ring-1 ring-orange-300/55">
                <Flame size={16} strokeWidth={2.2} className="drop-shadow-[0_0_10px_rgba(251,146,60,0.45)]" />
              </span>
              <p className="min-w-0 text-[10px] font-bold uppercase leading-tight tracking-[0.14em] text-indigo-900/60">
                Application Streak
              </p>
            </div>
            <p className="mb-2 text-xl font-black tabular-nums tracking-tight bg-gradient-to-br from-slate-900 via-indigo-800 to-violet-900 bg-clip-text text-transparent drop-shadow-[0_0_18px_rgba(99,102,241,0.15)]">
              {streakLabel}
            </p>
            <p className="mb-2 text-[11px] font-semibold tabular-nums text-slate-600">
              {appliedToday ? '1/1' : '0/1'}{' '}
              <span className="font-medium text-slate-500">today</span>
            </p>
            <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-slate-300/80 shadow-inner ring-1 ring-slate-400/15">
              <div
                className={`h-full rounded-full transition-all duration-500 ease-out ${
                  appliedToday
                    ? 'w-full bg-gradient-to-r from-amber-400 via-orange-500 to-orange-600 shadow-[0_0_12px_rgba(251,146,60,0.38),0_0_20px_rgba(249,115,22,0.15)]'
                    : 'w-[12%] bg-gradient-to-r from-slate-400/80 to-slate-500/60 opacity-75'
                }`}
              />
            </div>
            {bestLine && (
              <p className="text-[10px] font-medium leading-snug text-slate-500">{bestLine}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
