'use client';

import { useMemo, type ReactNode } from 'react';
import { Check, Flame, Zap } from 'lucide-react';
import type { Job } from '@/lib/types';
import type { JobStreakSummary, WeekStreakDay } from '@/lib/job-streak';
import { computeWeekStreakDays } from '@/lib/job-streak';

interface Props {
  summary: JobStreakSummary;
  jobs: Job[];
}

function WeekDayDot({ day }: { day: WeekStreakDay }) {
  const { completed, isToday, isMissed, isFuture } = day;

  let circleClass =
    'flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full border-2 transition-all duration-300 ';
  let inner: ReactNode = null;

  if (completed) {
    circleClass +=
      'border-emerald-300/80 bg-gradient-to-br from-emerald-400/90 to-indigo-500/75 text-white '
      + 'shadow-[0_0_8px_rgba(52,211,153,0.28),0_0_14px_rgba(79,70,229,0.1)] scale-105';
    inner = <Check size={16} strokeWidth={2.5} className="drop-shadow-sm" />;
  } else if (isToday) {
    circleClass +=
      'border-amber-400/70 bg-amber-50/90 text-amber-800 '
      + 'shadow-[0_0_10px_rgba(251,191,36,0.22),inset_0_1px_0_rgba(255,255,255,0.65)] ring-2 ring-amber-400/45 ring-offset-2 ring-offset-[#d0d8e6]';
  } else if (isMissed) {
    circleClass += 'border-slate-200/90 bg-slate-100/80 text-slate-300 opacity-80';
  } else if (isFuture) {
    circleClass += 'border-slate-200/60 bg-white/50 text-slate-300';
  } else {
    circleClass += 'border-slate-200/80 bg-slate-50/90 text-slate-400';
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
      <div className={circleClass}>{inner}</div>
      <span
        className={`max-w-[3.25rem] truncate text-center text-[10px] font-semibold uppercase tracking-wide sm:text-[11px] ${
          isToday ? 'text-amber-900/90' : completed ? 'text-emerald-900/88' : 'text-slate-600'
        }`}
      >
        {day.label}
      </span>
    </div>
  );
}

export default function JobStreakCard({ summary, jobs }: Props) {
  const { currentStreak, longestStreak, appliedToday } = summary;
  const weekDays = useMemo(() => computeWeekStreakDays(jobs), [jobs]);

  const streakHot = appliedToday && currentStreak > 0;
  const headline =
    currentStreak === 0
      ? 'Start your streak'
      : currentStreak === 1
        ? '1 day streak'
        : `${currentStreak} day streak`;

  const subtitle = appliedToday
    ? 'You applied to at least 1 job today. Keep it up! 🔥'
    : 'Apply to 1 job today to keep your streak alive.';

  const actionHint = appliedToday
    ? 'Apply to 1 job tomorrow'
    : 'Apply to 1 job today to lock it in.';

  const numHero =
    'font-black tabular-nums tracking-tight bg-gradient-to-br from-slate-900 via-indigo-800 to-indigo-950 bg-clip-text text-transparent drop-shadow-[0_1px_2px_rgba(15,23,42,0.12)]';

  return (
    <div
      className="group relative overflow-hidden rounded-3xl border border-white/40 bg-gradient-to-br from-[#cfd6e4] via-[#c6cfdf] to-[#bac4d8] p-6 shadow-[0_22px_52px_-14px_rgba(15,23,42,0.14),0_0_0_1px_rgba(255,255,255,0.5)_inset] ring-1 ring-slate-900/[0.05] transition-transform duration-300 ease-out hover:scale-[1.006] hover:shadow-[0_26px_56px_-12px_rgba(15,23,42,0.16)] sm:p-8"
    >
      <div
        className="pointer-events-none absolute -left-1/4 -top-24 h-48 w-[150%] bg-gradient-to-b from-indigo-300/22 via-indigo-400/5 to-transparent blur-2xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-10 top-1/3 h-40 w-40 rounded-full bg-sky-400/14 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-0 left-1/2 h-32 w-[80%] -translate-x-1/2 bg-gradient-to-t from-indigo-200/28 to-transparent blur-2xl"
        aria-hidden
      />

      <div className="pointer-events-none absolute inset-0 opacity-[0.2]" aria-hidden>
        {[
          ['12%', '18%'],
          ['88%', '12%'],
          ['72%', '28%'],
          ['22%', '62%'],
          ['54%', '8%'],
          ['8%', '78%'],
          ['92%', '70%'],
        ].map(([l, t], i) => (
          <span
            key={i}
            className="absolute h-0.5 w-0.5 rounded-full bg-slate-500/45 shadow-[0_0_4px_rgba(100,116,139,0.22)]"
            style={{ left: l, top: t }}
          />
        ))}
      </div>

      <div className="relative flex flex-col gap-8 lg:flex-row lg:items-stretch lg:gap-10">
        <div className="flex shrink-0 justify-center lg:justify-start">
          <div
            className={
              'relative flex h-[7.5rem] w-[7.5rem] items-center justify-center rounded-full border border-white/50 '
              + 'bg-gradient-to-br from-white/92 via-indigo-100/45 to-slate-200/75 '
              + (streakHot ? 'streak-flame-pulse' : '')
            }
            style={
              streakHot
                ? undefined
                : {
                    boxShadow:
                      '0 8px 28px rgba(15,23,42,0.1), inset 0 1px 0 rgba(255,255,255,0.85)',
                  }
            }
          >
            <div
              className={
                'flex h-[5.25rem] w-[5.25rem] items-center justify-center rounded-full bg-gradient-to-br from-amber-400 via-orange-500 to-rose-600 '
                + (streakHot
                  ? 'shadow-[0_0_18px_rgba(251,146,60,0.34)]'
                  : 'shadow-[0_0_12px_rgba(251,146,60,0.22)] opacity-95')
              }
            >
              <Flame
                size={44}
                strokeWidth={1.75}
                className={
                  streakHot
                    ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.75)]'
                    : 'text-white/95'
                }
                fill={streakHot ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.14)'}
              />
            </div>
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-950/50">
              Application streak
            </p>
            <h3 className="mt-2 font-black tracking-tight leading-none text-slate-900 text-[1.65rem] sm:text-4xl">
              {currentStreak === 0 ? (
                headline
              ) : (
                <>
                  <span className={`${numHero} text-[1.65rem] sm:text-4xl`}>{currentStreak}</span>
                  <span className="text-[1.65rem] font-bold text-slate-800 sm:text-4xl">
                    {currentStreak === 1 ? ' day streak' : ' days streak'}
                  </span>
                </>
              )}
            </h3>
            <p
              className={`mt-3 max-w-xl text-sm leading-relaxed sm:text-base ${
                appliedToday ? 'text-emerald-900/92' : 'text-slate-700'
              }`}
            >
              {subtitle}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-700 sm:text-sm">
              <span>Today progress</span>
              <div className="flex items-center gap-3">
                <span className={`tabular-nums text-xl font-black sm:text-2xl ${numHero}`}>
                  {appliedToday ? '1' : '0'}/1
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-950/45">
                  Goal
                </span>
              </div>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-300/90 shadow-inner ring-1 ring-slate-400/30">
              <div
                className={
                  'h-full rounded-full bg-gradient-to-r from-sky-400 via-indigo-500 to-indigo-600 transition-all duration-700 ease-out '
                  + (appliedToday
                    ? 'w-full shadow-[0_0_8px_rgba(99,102,241,0.16)]'
                    : 'w-[6%] opacity-50')
                }
              />
            </div>
          </div>

          <div>
            <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-600">
              This week
            </p>
            <div className="flex justify-between gap-1 sm:gap-2">
              {weekDays.map((d) => (
                <WeekDayDot key={d.ymd} day={d} />
              ))}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col justify-between gap-4 lg:w-[200px] xl:w-[220px]">
          <div className="rounded-2xl border border-slate-400/35 bg-white/50 px-4 py-4 shadow-[0_10px_26px_-10px_rgba(15,23,42,0.11)] backdrop-blur-md transition-colors duration-300 group-hover:bg-white/58">
            <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-950/48">
              Best streak
            </p>
            <p className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5 leading-none">
              {longestStreak === 0 ? (
                <span className="text-3xl font-black text-slate-700">—</span>
              ) : (
                <>
                  <span className={`text-3xl sm:text-[2rem] ${numHero}`}>{longestStreak}</span>
                  <span className="text-lg font-bold text-slate-600">
                    {longestStreak === 1 ? 'day' : 'days'}
                  </span>
                </>
              )}
            </p>
          </div>

          <div className="rounded-2xl border border-amber-300/55 bg-gradient-to-br from-amber-50/92 via-white/45 to-orange-50/35 px-4 py-4 shadow-[0_8px_22px_-8px_rgba(120,53,15,0.08)] backdrop-blur-sm">
            <div className="flex items-center gap-2 text-amber-900">
              <Zap size={18} strokeWidth={2.2} className="shrink-0 text-amber-600" />
              <span className="text-sm font-bold tracking-tight">Keep it alive</span>
            </div>
            <p className="mt-2 text-xs leading-snug text-slate-700">{actionHint}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
