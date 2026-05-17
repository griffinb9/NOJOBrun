'use client';

import { useEffect, useId, useState } from 'react';
import { motion } from 'framer-motion';
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
  'Underdog':      { icon: Rocket,     badgeClass: 'border border-slate-200/90 bg-slate-100/90 text-slate-800 shadow-[0_1px_2px_rgba(15,23,42,0.06),0_2px_16px_-4px_rgba(245,185,66,0.07)] ring-1 ring-white/60' },
  'On the Rise':   { icon: TrendingUp, badgeClass: 'border border-blue-300/85 bg-gradient-to-r from-blue-50/98 to-indigo-50/90 text-blue-950 shadow-[0_4px_12px_-4px_rgba(59,130,246,0.12),0_2px_18px_-4px_rgba(245,185,66,0.08)] ring-1 ring-blue-200/50' },
  'Locked In':     { icon: Target,     badgeClass: 'border border-indigo-300/80 bg-gradient-to-r from-indigo-50/98 to-violet-50/85 text-indigo-950 shadow-[0_4px_14px_-4px_rgba(99,102,241,0.14),0_2px_20px_-4px_rgba(245,185,66,0.09)] ring-1 ring-indigo-200/55' },
  'Interview Pro': { icon: Mic,        badgeClass: 'border border-amber-300/75 bg-amber-50/95 text-amber-950 shadow-md shadow-amber-500/12 ring-1 ring-amber-200/50' },
  'Offer Season':  { icon: Sparkles,   badgeClass: 'border border-emerald-300/75 bg-emerald-50/95 text-emerald-950 shadow-[0_4px_12px_-4px_rgba(16,185,129,0.12),0_2px_16px_-4px_rgba(245,185,66,0.07)] ring-1 ring-emerald-200/50' },
};

const POINT_BADGES: { label: string; pts: number; icon: LucideIcon }[] = [
  { label: 'Apply', pts: 5, icon: Send },
  { label: 'Screen', pts: 15, icon: PhoneCall },
  { label: 'Interview', pts: 25, icon: Mic },
  { label: 'Offer', pts: 100, icon: Trophy },
];

export default function RankCard({ refreshKey, streakSummary }: Props) {
  const fireGradientId = useId().replace(/:/g, '');
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

  const streakActive = currentStreak > 0 || appliedToday;
  const streakStatusLabel = streakActive ? 'Streak active' : 'Streak inactive';
  const streakMicrocopy = streakActive ? 'Keep it burning' : 'Apply today to spark it';

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
    <motion.div
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -2, transition: { type: 'spring', stiffness: 340, damping: 26 } }}
      className="group relative mb-10 overflow-hidden rounded-[1.75rem] border border-white/80 bg-gradient-to-br from-white/85 via-indigo-100/40 to-violet-100/35 p-[1px] shadow-[0_32px_72px_-22px_rgba(49,46,129,0.22),0_0_0_1px_rgba(255,255,255,0.88)_inset] ring-1 ring-indigo-200/25 backdrop-blur-xl transition-shadow duration-300 ease-out hover:shadow-[0_40px_80px_-20px_rgba(49,46,129,0.26),0_0_64px_rgba(99,102,241,0.14),0_0_52px_rgba(245,185,66,0.08)]"
    >
      <div className="relative overflow-hidden rounded-[1.7rem] bg-gradient-to-br from-white/[0.78] via-indigo-50/25 to-violet-50/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.98)] backdrop-blur-md">
      <div className="pointer-events-none absolute -left-16 -top-12 h-52 w-64 rounded-full bg-indigo-500/[0.16] blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -right-14 bottom-0 h-44 w-52 rounded-full bg-sky-500/[0.18] blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute left-1/2 top-0 h-36 w-[90%] -translate-x-1/2 rounded-[100%] bg-violet-400/[0.12] blur-2xl" aria-hidden />
      <div
        className="rank-card-rim-light pointer-events-none absolute inset-0 rounded-[1.65rem] bg-[conic-gradient(from_200deg_at_50%_50%,rgba(99,102,241,0.14),transparent_32%,rgba(56,189,248,0.1),transparent_62%,rgba(245,185,66,0.12),transparent_90%)] opacity-70 mix-blend-soft-light"
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 rounded-[1.65rem] bg-[radial-gradient(ellipse_95%_65%_at_50%_-5%,rgba(255,255,255,0.58),transparent_55%)]" aria-hidden />
      <div className="pointer-events-none absolute inset-0 rounded-[1.65rem] bg-[radial-gradient(ellipse_70%_55%_at_92%_88%,rgba(99,102,241,0.12),transparent_52%)]" aria-hidden />
      <div className="pointer-events-none absolute inset-0 rounded-[1.65rem] bg-[radial-gradient(ellipse_45%_40%_at_8%_75%,rgba(56,189,248,0.09),transparent_58%)]" aria-hidden />

      <div className="relative p-5 md:p-7">
        <div
          className="pointer-events-none absolute left-6 right-6 top-4 z-[1] h-px rounded-full bg-gradient-to-r from-transparent via-[#E9A93D]/28 to-transparent md:left-7 md:right-7 md:top-5"
          aria-hidden
        />
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:gap-10">

          <div className="flex shrink-0 justify-center lg:justify-start">
            <motion.div
              className="transition-all duration-300 group-hover:[filter:brightness(1.02)]"
              whileHover={{ scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 280, damping: 18 }}
            >
              <SegmentedProgressRing percent={progressPercent} size={172} segmentCount={32} variant="light">
                <div
                  className="flex flex-col items-center justify-center rounded-full px-3 py-3 text-center select-none"
                  style={{
                    background: 'linear-gradient(165deg, rgba(255,255,255,0.98), rgba(241,245,253,0.94), rgba(238,242,255,0.88))',
                    boxShadow:
                      'inset 0 1px 0 rgba(255,255,255,0.98), 0 14px 44px rgba(30,27,75,0.13), 0 0 40px rgba(99,102,241,0.16), 0 0 28px rgba(139,92,246,0.1), 0 0 0 1px rgba(255,255,255,0.55)',
                    minWidth: 92,
                    minHeight: 92,
                  }}
                >
                  <span className="mb-1 max-w-[80px] truncate text-[9px] font-bold uppercase leading-none tracking-[0.14em] text-slate-500">
                    Rank
                  </span>
                  <span
                    className="font-black leading-none tabular-nums tracking-tight bg-gradient-to-br from-slate-900 via-indigo-700 to-violet-900 bg-clip-text text-transparent drop-shadow-[0_1px_2px_rgba(15,23,42,0.12),0_0_28px_rgba(99,102,241,0.2),0_0_36px_rgba(91,33,182,0.08)]"
                    style={{ fontSize: '2.45rem' }}
                  >
                    {progress.totalPoints}
                  </span>
                  <span className="mt-0.5 text-[11px] font-semibold leading-none tracking-wide text-slate-600">pts</span>
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
            </motion.div>
          </div>

          <div className="min-w-0 flex-1 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold tracking-tight ${meta.badgeClass}`}
              >
                <RankIcon size={16} strokeWidth={2.2} className="shrink-0 opacity-90" />
                {current.name}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200/70 bg-white/78 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-700 shadow-sm shadow-indigo-500/12 ring-1 ring-indigo-100/85 backdrop-blur-sm transition-shadow duration-300 group-hover:border-[#E9A93D]/32 group-hover:shadow-[0_0_20px_rgba(99,102,241,0.14),0_0_18px_rgba(245,185,66,0.1)] group-hover:ring-[#F5B942]/22">
                <Zap size={11} className="text-indigo-600 drop-shadow-[0_0_8px_rgba(99,102,241,0.28),0_0_10px_rgba(233,169,61,0.2)]" />
                Personal rank
              </span>
            </div>

            <p className="text-sm leading-relaxed text-slate-700">{current.description}</p>

            <div>
              {isMaxRank ? (
                <p className="text-sm font-semibold text-emerald-700">{progressLine}</p>
              ) : (
                <p className="text-sm text-slate-700">
                  <span className="font-bold bg-gradient-to-r from-sky-600 via-indigo-600 to-violet-700 bg-clip-text text-transparent drop-shadow-[0_0_14px_rgba(59,130,246,0.18)]">
                    {pointsToNext}
                  </span>
                  <span className="font-bold text-indigo-950/55"> pts</span>
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
                  className="inline-flex items-center gap-2 rounded-xl border border-indigo-200/55 bg-white/62 px-2.5 py-1.5 shadow-sm shadow-indigo-500/10 ring-0 backdrop-blur-sm transition-all duration-200 hover:border-[#E9A93D]/35 hover:bg-white/88 hover:shadow-[0_4px_20px_-2px_rgba(99,102,241,0.12),0_0_22px_rgba(245,185,66,0.1)] hover:ring-1 hover:ring-[#F5B942]/22"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-200/90 via-violet-100/80 to-[#FFF8ED]/95 text-indigo-900 shadow-sm shadow-indigo-500/15 ring-1 ring-[#E9A93D]/12">
                    <Icon size={14} strokeWidth={2} />
                  </span>
                  <span className="text-[11px] font-bold tabular-nums bg-gradient-to-r from-sky-600 to-indigo-700 bg-clip-text text-transparent">+{pts}</span>
                  <span className="text-[11px] font-medium text-slate-600">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="hidden w-px shrink-0 self-stretch lg:block [background:linear-gradient(to_bottom,transparent,rgba(99,102,241,0.28),rgba(139,92,246,0.14),rgba(56,189,248,0.1),transparent)]" />

          <div
            className={`streak-widget-shell group/streak relative shrink-0 overflow-hidden rounded-2xl border bg-white/60 p-3.5 backdrop-blur-md transition-all duration-300 ease-out hover:-translate-y-0.5 lg:w-[13.75rem] ${
              streakActive
                ? 'border-[#F5B942]/55 ring-1 ring-[#FF8A3D]/38 ring-offset-0 streak-widget-active-glow hover:border-[#FF8A3D]/65 hover:ring-[#F5B942]/45 hover:shadow-[0_18px_44px_-10px_rgba(49,46,129,0.18),0_0_48px_rgba(249,115,22,0.28),0_0_64px_rgba(245,185,66,0.18),0_0_0_1px_rgba(255,255,255,0.75)_inset]'
                : 'border-indigo-200/55 ring-1 ring-slate-200/65 shadow-[0_12px_32px_-10px_rgba(49,46,129,0.12),0_0_16px_rgba(245,185,66,0.04),0_0_0_1px_rgba(255,255,255,0.68)_inset] hover:shadow-[0_14px_32px_-10px_rgba(49,46,129,0.14)]'
            }`}
          >
            <div
              className={`pointer-events-none absolute left-3 right-3 top-3 h-px rounded-full opacity-90 ${
                streakActive
                  ? 'bg-gradient-to-r from-transparent via-[#FF8A3D]/55 to-transparent'
                  : 'bg-gradient-to-r from-transparent via-[#F5B942]/22 to-transparent'
              }`}
              aria-hidden
            />
            {streakActive && (
              <div
                className="pointer-events-none absolute -inset-px rounded-2xl opacity-[0.4]"
                style={{
                  background:
                    'radial-gradient(ellipse 90% 65% at 50% 0%, rgba(249,115,22,0.14), transparent 55%), radial-gradient(ellipse 55% 45% at 92% 42%, rgba(245,185,66,0.18), transparent 52%)',
                }}
                aria-hidden
              />
            )}
            <p className="relative mb-1 text-[10px] font-bold uppercase leading-tight tracking-[0.14em] text-indigo-900/60">
              Application Streak
            </p>
            <p
              className={`relative mb-2.5 text-[10px] font-semibold uppercase tracking-wider ${
                streakActive ? 'text-[#c2410c]/85' : 'text-slate-500'
              }`}
            >
              {streakStatusLabel}
            </p>

            <div className="relative -mx-0.5 mb-2 rounded-xl px-2 py-2.5 sm:py-3">
              <div
                className={`pointer-events-none absolute inset-0 rounded-xl ${
                  streakActive
                    ? 'bg-[radial-gradient(ellipse_115%_90%_at_45%_45%,rgba(255,255,255,0.65),rgba(255,247,237,0.35)_45%,transparent_72%)] opacity-95'
                    : 'bg-[radial-gradient(ellipse_100%_85%_at_50%_50%,rgba(255,255,255,0.5),transparent_68%)] opacity-90'
                }`}
                aria-hidden
              />
              {streakActive && (
                <div
                  className="pointer-events-none absolute inset-0 rounded-xl opacity-80"
                  style={{
                    background:
                      'radial-gradient(circle 4.5rem at 92% 50%, rgba(249,115,22,0.14), transparent 70%)',
                  }}
                  aria-hidden
                />
              )}
              <div className="relative flex min-h-[3.25rem] items-center justify-between gap-2">
                <p
                  className={`min-w-0 flex-1 leading-[1.1] tracking-tight ${
                    streakActive
                      ? 'bg-gradient-to-br from-[#9a3412] via-[#ea580c] to-[#fbbf24] bg-clip-text text-[1.35rem] font-black text-transparent drop-shadow-[0_1px_0_rgba(255,255,255,0.4),0_0_28px_rgba(249,115,22,0.28),0_0_48px_rgba(245,185,66,0.16)] sm:text-[1.55rem]'
                      : 'bg-gradient-to-br from-slate-800 via-slate-700 to-slate-600 bg-clip-text text-[1.2rem] font-black text-transparent sm:text-[1.35rem]'
                  }`}
                >
                  {streakLabel}
                </p>
                <div className="relative shrink-0" aria-hidden>
                  <svg className="absolute h-0 w-0 overflow-hidden" aria-hidden>
                    <defs>
                      <linearGradient id={fireGradientId} x1="0%" y1="100%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#F5B942" />
                        <stop offset="40%" stopColor="#FF8A3D" />
                        <stop offset="100%" stopColor="#F97316" />
                      </linearGradient>
                    </defs>
                  </svg>
                  {streakActive ? (
                    <div className="relative flex h-[3.55rem] w-[3.55rem] items-center justify-center rounded-full bg-gradient-to-b from-white/65 via-orange-50/45 to-[#ffedd5]/60 shadow-[0_10px_32px_rgba(249,115,22,0.38),0_0_0_1px_rgba(255,255,255,0.62)_inset,inset_0_-2px_10px_rgba(234,88,12,0.12)] ring-[3px] ring-[#FF8A3D]/50 transition-shadow duration-300 group-hover/streak:shadow-[0_12px_36px_rgba(249,115,22,0.48),0_0_40px_rgba(245,185,66,0.32),0_0_0_1px_rgba(255,255,255,0.7)_inset] sm:h-[3.75rem] sm:w-[3.75rem]">
                      <span className="pointer-events-none absolute inset-[-14px] rounded-full bg-[radial-gradient(circle,rgba(249,115,22,0.22)_0%,transparent_68%)] opacity-90" aria-hidden />
                      <span className="streak-flame-aura pointer-events-none absolute inset-[-12px] rounded-full bg-gradient-to-br from-[#F5B942]/6 via-[#FF8A3D]/38 to-[#f97316]/28 blur-xl transition-opacity duration-300 group-hover/streak:opacity-100 group-hover/streak:blur-[1.15rem]" />
                      <span className="pointer-events-none absolute inset-[3px] rounded-full bg-gradient-to-t from-orange-200/30 to-transparent opacity-75" />
                      <Flame
                        strokeWidth={2}
                        className="relative z-[1] h-11 w-11 text-white streak-flame-mega-active transition-transform duration-300 group-hover/streak:scale-[1.06] sm:h-12 sm:w-12"
                        fill={`url(#${fireGradientId})`}
                        stroke="#9a3412"
                      />
                    </div>
                  ) : (
                    <div className="flex h-[3.35rem] w-[3.35rem] items-center justify-center rounded-full bg-slate-100/95 ring-2 ring-slate-300/80 ring-offset-2 ring-offset-white/50 shadow-inner sm:h-[3.55rem] sm:w-[3.55rem]">
                      <Flame
                        strokeWidth={2.25}
                        className="h-10 w-10 text-slate-400 sm:h-11 sm:w-11"
                        fill="none"
                        stroke="currentColor"
                        strokeOpacity={0.55}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <p
              className={`relative mb-1 text-[11px] font-medium leading-snug ${
                streakActive ? 'text-[#9a3412]/88' : 'text-slate-500'
              }`}
            >
              {streakMicrocopy}
            </p>
            {bestLine && (
              <p className="relative text-[10px] font-medium leading-snug text-[#6B5B3E]/90">{bestLine}</p>
            )}
          </div>
        </div>
      </div>
      </div>
    </motion.div>
  );
}
