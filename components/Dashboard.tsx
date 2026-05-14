'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Plus,
  Briefcase,
  Percent,
  CalendarDays,
  Clock,
  AlertTriangle,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';
import { db } from '@/lib/db';
import { useAuth } from '@/lib/auth';
import { Job, STATUS_COLORS, STATUS_BORDER, STATUS_LABELS, UserProgress } from '@/lib/types';
import { useOpenAddJob } from '@/components/jobs/JobAddModalProvider';
import { subscribeJobsMutated } from '@/lib/jobsMutateEvents';
import RankCard from './dashboard/RankCard';
import UserAvatar from '@/components/ui/UserAvatar';
import { computeJobStreak } from '@/lib/job-streak';
import { formatDate, daysSince, getDashboardTitle } from '@/lib/utils';
import { getRank } from '@/lib/points';
import { autoGhostStaleApplications } from '@/lib/autoGhost';
import type { LucideIcon } from 'lucide-react';
import { useAchievementLevelUpRequest } from '@/components/achievements/AchievementLevelUpProvider';

const GREETINGS = [
  "Let's get after it",
  "You're building momentum",
  "Stay locked in",
  "Big week ahead",
  "Every app counts",
];

type StatItem = {
  label: string;
  value: string | number;
  icon: LucideIcon;
  iconBg: string;
  valueClass: string;
  subAccent?: string;
  warn?: boolean;
  /** Optional corner hint — purely decorative */
  trend?: 'positive' | 'neutral' | 'attention';
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 380, damping: 28 },
  },
};

function AnimatedStatNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const start = performance.now();
    const duration = 720;
    function tick(now: number) {
      if (cancelled) return;
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(eased * value));
      if (t < 1) {
        raf.current = requestAnimationFrame(tick);
      }
    }
    raf.current = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [value]);

  return (
    <>
      {display}
      {suffix}
    </>
  );
}

function StatValue({ value }: { value: string | number }) {
  if (value === '—') return <>—</>;
  if (typeof value === 'number') return <AnimatedStatNumber value={value} />;
  if (typeof value === 'string' && value.endsWith('%')) {
    const n = parseInt(value, 10);
    if (Number.isNaN(n)) return <>{value}</>;
    return <AnimatedStatNumber value={n} suffix="%" />;
  }
  return <>{value}</>;
}

export default function Dashboard() {
  const { profile } = useAuth();
  const openAddJob = useOpenAddJob();
  const requestAchievementLevelCheck = useAchievementLevelUpRequest();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [rankKey, setRankKey] = useState(0);
  const [greeting] = useState(() => GREETINGS[Math.floor(Math.random() * GREETINGS.length)]);

  const refreshJobs = useCallback(async () => {
    const [rawJobs, p] = await Promise.all([db.getJobs(), db.getUserProgress()]);
    const j = await autoGhostStaleApplications(rawJobs);
    const nextProgress = await db.syncJobStreakFromJobs(j, p);
    setJobs(j);
    setProgress(nextProgress);
    void requestAchievementLevelCheck();
  }, [requestAchievementLevelCheck]);

  useEffect(() => {
    void refreshJobs();
  }, [refreshJobs]);

  useEffect(() => {
    return subscribeJobsMutated(() => {
      void refreshJobs();
      setRankKey((k) => k + 1);
    });
  }, [refreshJobs]);

  if (!profile || !progress) return null;

  const title = getDashboardTitle(profile.fullName);
  const currentRank = getRank(progress.totalPoints);

  const total = jobs.length;
  const withResponse = jobs.filter((j) => j.hasResponse === true).length;
  const responseRate = total === 0 ? 0 : Math.round((withResponse / total) * 100);

  const upcomingInterviews = jobs.filter((j) => {
    if (!j.interviewDates?.length) return false;
    return j.interviewDates.some((d) => new Date(d) >= new Date());
  }).length;

  const lastApplied = jobs
    .filter((j) => j.dateApplied)
    .sort((a, b) => new Date(b.dateApplied!).getTime() - new Date(a.dateApplied!).getTime())[0];

  const daysSinceLast = lastApplied?.dateApplied ? daysSince(lastApplied.dateApplied) : null;
  const isStale = daysSinceLast !== null && daysSinceLast > 7;

  const recent = [...jobs]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  const streakSummary = computeJobStreak(jobs);

  const subtitle = (() => {
    if (total === 0) return 'Add your first application to get started.';
    if (upcomingInterviews > 0)
      return `${upcomingInterviews} interview${upcomingInterviews !== 1 ? 's' : ''} coming up — go crush it.`;
    if (isStale) return `Last applied ${daysSinceLast} days ago. Time to get back out there.`;
    return `${total} application${total !== 1 ? 's' : ''} tracked and counting.`;
  })();

  const stats: StatItem[] = [
    {
      label: 'Applications',
      value: total,
      icon: Briefcase,
      iconBg:
        'from-sky-500/20 via-indigo-400/12 to-violet-500/14 text-sky-800 ring-sky-500/25 shadow-inner shadow-sky-500/10',
      valueClass:
        'bg-gradient-to-br from-slate-900 via-indigo-700 to-violet-900 bg-clip-text text-transparent drop-shadow-[0_1px_2px_rgba(15,23,42,0.1),0_0_28px_rgba(99,102,241,0.18)]',
      trend: total > 0 ? 'positive' : 'neutral',
    },
    {
      label: 'Response rate',
      value: `${responseRate}%`,
      icon: Percent,
      iconBg:
        'from-indigo-500/18 via-violet-400/10 to-sky-500/12 text-indigo-800 ring-indigo-500/22 shadow-inner shadow-indigo-500/10',
      valueClass:
        'bg-gradient-to-br from-slate-900 via-indigo-700 to-violet-950 bg-clip-text text-transparent drop-shadow-[0_1px_2px_rgba(15,23,42,0.1),0_0_26px_rgba(99,102,241,0.2)]',
      trend: responseRate >= 40 ? 'positive' : 'neutral',
    },
    {
      label: 'Upcoming interviews',
      value: upcomingInterviews,
      icon: CalendarDays,
      iconBg: upcomingInterviews > 0
        ? 'from-emerald-500/28 to-teal-500/18 text-emerald-800 ring-emerald-500/35 shadow-inner shadow-emerald-500/15'
        : 'from-slate-400/16 via-slate-300/8 to-slate-500/10 text-slate-500 ring-slate-400/18',
      valueClass:
        upcomingInterviews > 0
          ? 'bg-gradient-to-br from-emerald-800 via-teal-700 to-emerald-950 bg-clip-text text-transparent drop-shadow-[0_1px_2px_rgba(6,78,59,0.1),0_0_22px_rgba(16,185,129,0.16)]'
          : 'text-slate-400',
      subAccent: upcomingInterviews > 0 ? 'text-emerald-700/85' : undefined,
      trend: upcomingInterviews > 0 ? 'positive' : 'neutral',
    },
    {
      label: 'Days since last app',
      value: daysSinceLast !== null ? daysSinceLast : '—',
      icon: isStale ? AlertTriangle : Clock,
      iconBg: isStale
        ? 'from-amber-500/28 to-orange-500/20 text-amber-700 ring-amber-500/32 shadow-inner shadow-amber-500/12'
        : 'from-slate-400/14 via-slate-300/10 to-slate-500/10 text-slate-600 ring-slate-400/18',
      valueClass: isStale
        ? 'bg-gradient-to-br from-amber-800 via-orange-600 to-amber-950 bg-clip-text text-transparent drop-shadow-[0_1px_2px_rgba(120,53,15,0.1),0_0_20px_rgba(245,158,11,0.2)]'
        : daysSinceLast !== null
          ? 'bg-gradient-to-br from-slate-900 via-indigo-700 to-violet-900 bg-clip-text text-transparent drop-shadow-[0_1px_2px_rgba(15,23,42,0.1),0_0_24px_rgba(99,102,241,0.14)]'
          : 'text-slate-400',
      warn: isStale,
      trend: isStale ? 'attention' : 'neutral',
    },
  ];

  const particleDelays = ['0s', '2.2s', '4.1s', '1.3s', '5.5s', '3.4s'];

  return (
    <div className="relative min-h-full w-full overflow-x-clip">
      {/* Atmosphere — soft mesh + depth */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#eceef8] via-[#e8ecf6] to-[#dfe6f3]"
        aria-hidden
      />
      <div
        className="dashboard-mesh-breathe pointer-events-none absolute inset-0 opacity-[0.97] bg-[radial-gradient(ellipse_110%_80%_at_50%_-8%,rgba(99,102,241,0.13),transparent_58%),radial-gradient(ellipse_70%_55%_at_100%_38%,rgba(14,165,233,0.09),transparent_52%),radial-gradient(ellipse_55%_50%_at_0%_92%,rgba(245,158,11,0.055),transparent_56%),radial-gradient(ellipse_45%_35%_at_82%_100%,rgba(139,92,246,0.06),transparent_50%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent opacity-50"
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 dashboard-noise-overlay" aria-hidden />

      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        {[
          ['12%', '24%', 'h-1 w-1'],
          ['82%', '16%', 'h-1.5 w-1.5'],
          ['70%', '58%', 'h-1 w-1'],
          ['24%', '68%', 'h-1.5 w-1.5'],
        ].map(([left, top, size], i) => (
          <span
            key={i}
            className={`dashboard-particle absolute rounded-full bg-gradient-to-br from-indigo-400/40 to-violet-300/28 blur-[0.5px] opacity-90 ${size}`}
            style={{ left, top, animationDelay: particleDelays[i] ?? '0s' }}
          />
        ))}
      </div>

      <div className="relative z-[1] mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 md:px-10 md:py-12">

        {!profile.username?.trim() && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 rounded-2xl border border-indigo-200/70 bg-white/75 px-4 py-3.5 text-sm text-slate-800 shadow-[0_12px_40px_-16px_rgba(99,102,241,0.15)] backdrop-blur-md ring-1 ring-white/80 sm:px-5"
          >
            <p className="font-semibold text-indigo-900">Choose a username to unlock Friends</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              Your applications and prep stay private. Friends only see rank, points, streaks, and achievements.
            </p>
            <Link
              href="/profile"
              className="mt-2 inline-flex text-xs font-bold text-indigo-600 transition hover:text-indigo-800"
            >
              Set username in Profile →
            </Link>
          </motion.div>
        )}

        {/* Hero — frosted command deck */}
        <section className="relative mb-10 md:mb-12">
          <div
            className="relative overflow-hidden rounded-[1.75rem] border border-white/75 bg-white/[0.48] p-6 shadow-[0_24px_56px_-28px_rgba(30,27,75,0.2),0_0_0_1px_rgba(255,255,255,0.65)_inset,0_1px_0_rgba(255,255,255,0.9)_inset] ring-1 ring-slate-900/[0.05] backdrop-blur-2xl md:p-8"
          >
            <div
              className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-gradient-to-br from-indigo-400/20 via-violet-400/12 to-transparent blur-3xl"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-sky-400/14 blur-3xl"
              aria-hidden
            />

            <div className="relative grid gap-8 md:grid-cols-[1fr_auto] md:items-center md:gap-10">
              <motion.div
                className="min-w-0"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="relative inline-flex overflow-hidden rounded-xl border border-white/60 bg-gradient-to-r from-white/75 to-indigo-50/35 px-3.5 py-2 shadow-sm shadow-indigo-500/8 ring-1 ring-indigo-100/40 backdrop-blur-md sm:px-4">
                  <span
                    className="dashboard-hero-shimmer pointer-events-none absolute inset-y-0 left-0 w-[55%] bg-gradient-to-r from-transparent via-white/55 to-transparent"
                    aria-hidden
                  />
                  <p className="relative text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 sm:text-[11px]">
                    {greeting}
                  </p>
                </div>

                <div className="relative mt-5 flex min-w-0 items-start gap-3.5 sm:items-center sm:gap-4">
                  <motion.div
                    whileHover={{ scale: 1.03 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 20 }}
                    className="shrink-0"
                  >
                    <UserAvatar
                      src={profile.avatarUrl}
                      fullName={profile.fullName}
                      displayName={profile.displayName}
                      username={profile.username}
                      size="lg"
                      className="ring-[3px] ring-white shadow-[0_12px_36px_-8px_rgba(99,102,241,0.35),0_0_0_1px_rgba(226,232,240,0.9)]"
                    />
                  </motion.div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <h1 className="break-words text-2xl font-black leading-[1.06] tracking-[-0.035em] sm:text-4xl md:text-[2.45rem]">
                      <span className="bg-gradient-to-r from-slate-900 via-indigo-800 to-violet-800 bg-clip-text text-transparent">
                        {title}
                      </span>
                    </h1>
                  </div>
                </div>

                <motion.div
                  className="mt-4 flex flex-wrap items-center gap-2"
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                >
                  <motion.span
                    variants={itemVariants}
                    className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200/80 bg-white/90 px-3 py-1 text-xs font-bold text-slate-800 shadow-[0_2px_12px_-4px_rgba(99,102,241,0.12)] ring-1 ring-white/90 backdrop-blur-sm"
                  >
                    <Sparkles size={12} className="text-amber-500" strokeWidth={2.5} />
                    {currentRank.name}
                  </motion.span>
                  <motion.span variants={itemVariants} className="text-slate-300/90 text-xs font-light">
                    ·
                  </motion.span>
                  <motion.span
                    variants={itemVariants}
                    className="bg-gradient-to-r from-slate-900 via-indigo-700 to-violet-800 bg-clip-text text-xs font-black tabular-nums text-transparent drop-shadow-[0_0_12px_rgba(99,102,241,0.18)]"
                  >
                    {progress.totalPoints} pts
                  </motion.span>
                </motion.div>

                <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-600 md:text-[0.9375rem]">{subtitle}</p>
              </motion.div>

              <div className="flex flex-col gap-3 border-t border-slate-200/50 pt-6 md:border-l md:border-t-0 md:pl-10 md:pt-0">
                <motion.button
                  type="button"
                  onClick={() => openAddJob()}
                  className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-600 to-violet-700 px-5 py-3.5 text-sm font-bold text-white shadow-[0_14px_40px_-10px_rgba(79,70,229,0.45)] outline-none ring-1 ring-white/20 md:min-w-[12.5rem]"
                  whileHover={{
                    scale: 1.02,
                    boxShadow: '0 18px 48px -10px rgba(67,56,202,0.42), 0 0 36px rgba(245,185,66,0.12)',
                  }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 24 }}
                >
                  <span
                    className="pointer-events-none absolute inset-0 bg-gradient-to-r from-amber-300/0 via-amber-200/18 to-white/0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                    aria-hidden
                  />
                  <Plus size={16} strokeWidth={2.5} />
                  Add job
                </motion.button>
                <p className="text-center text-[11px] font-medium text-slate-500 md:text-left">
                  Log applications in seconds — stay on streak.
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="mb-3 flex items-center gap-2 md:mb-4">
          <span className="h-px flex-1 max-w-[3rem] rounded-full bg-gradient-to-r from-indigo-400/50 to-transparent" aria-hidden />
          <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">Your momentum</span>
          <span className="h-px flex-1 rounded-full bg-gradient-to-l from-violet-400/40 to-transparent" aria-hidden />
        </div>

        <RankCard refreshKey={rankKey} streakSummary={streakSummary} />

        {/* Stats — metric tiles */}
        <motion.div
          className="mb-10 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4"
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-40px' }}
        >
          {stats.map((s) => (
            <motion.div
              key={s.label}
              variants={itemVariants}
              whileHover={{ y: -4, transition: { type: 'spring', stiffness: 420, damping: 26 } }}
              whileTap={{ scale: 0.992 }}
              className={`
                group/stat relative overflow-hidden rounded-2xl border bg-white/[0.78] p-4 shadow-[0_4px_28px_-12px_rgba(15,23,42,0.1)] backdrop-blur-md transition-[border-color,box-shadow] duration-300
                before:pointer-events-none before:absolute before:inset-x-3 before:top-0 before:z-[1] before:h-px before:rounded-full before:bg-gradient-to-r before:from-transparent before:via-amber-400/35 before:to-transparent
                hover:border-indigo-300/70 hover:bg-white/[0.92] hover:shadow-[0_16px_44px_-14px_rgba(99,102,241,0.18),0_0_40px_rgba(245,185,66,0.06)]
                ${s.warn ? 'border-amber-300/80 ring-1 ring-amber-400/20' : 'border-slate-200/80 ring-1 ring-slate-900/[0.03]'}
              `}
            >
              <span
                className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/45 to-transparent opacity-0 transition duration-700 ease-out group-hover/stat:translate-x-full group-hover/stat:opacity-100"
                aria-hidden
              />
              {s.trend === 'positive' && (
                <span className="pointer-events-none absolute right-3 top-3 text-indigo-400/45 transition-colors duration-300 group-hover/stat:text-indigo-500/75">
                  <ArrowUpRight size={14} strokeWidth={2.5} />
                </span>
              )}
              <div
                className={`relative mb-3 inline-flex rounded-xl bg-gradient-to-br p-2.5 ring-1 ring-white/60 ${s.iconBg}`}
              >
                <s.icon size={18} strokeWidth={2.1} />
              </div>
              <div
                className={`relative text-[1.6rem] font-black tabular-nums leading-none tracking-tight sm:text-[1.9rem] ${s.valueClass}`}
              >
                <StatValue value={s.value} />
              </div>
              <div
                className={`relative mt-2 text-[10px] font-bold uppercase leading-snug tracking-[0.12em] sm:text-[11px] ${s.subAccent ?? 'text-slate-500'}`}
              >
                {s.label}
              </div>
              {s.warn && (
                <p className="relative mt-2 text-[10px] font-semibold text-amber-800/90">Time to send more apps</p>
              )}
            </motion.div>
          ))}
        </motion.div>

        {/* Recent applications */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-20px' }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-[1.35rem] border border-indigo-100/85 bg-white/[0.82] shadow-[0_16px_48px_-18px_rgba(49,46,129,0.14)] backdrop-blur-xl transition-shadow duration-300 before:pointer-events-none before:absolute before:inset-x-6 before:top-0 before:z-[1] before:h-px before:rounded-full before:bg-gradient-to-r before:from-transparent before:via-amber-400/35 before:to-transparent hover:shadow-[0_22px_56px_-16px_rgba(99,102,241,0.16)] md:before:inset-x-8"
        >
          <div className="flex items-center justify-between border-b border-slate-200/70 bg-gradient-to-r from-white via-indigo-50/35 to-amber-50/20 px-5 py-4 md:px-7">
            <h2 className="text-sm font-bold tracking-tight text-slate-900 md:text-[0.9375rem]">
              Recent applications
            </h2>
            <Link
              href="/tracker"
              className="rounded-lg px-2 py-1 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-50 hover:text-violet-800"
            >
              View all →
            </Link>
          </div>

          {recent.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-sm text-slate-500">No applications yet.</p>
              <button
                type="button"
                onClick={() => openAddJob()}
                className="mt-4 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition hover:shadow-indigo-500/35"
              >
                Add your first application
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100/90">
              {recent.map((job, idx) => (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, x: -6 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.035, duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                  className={`group/row flex items-center gap-3 px-4 py-3.5 transition-colors last:border-0 hover:bg-gradient-to-r hover:from-indigo-50/50 hover:to-transparent md:px-6 md:py-4 border-l-[3px] ${STATUS_BORDER[job.status]}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-slate-800 transition group-hover/row:text-indigo-950">
                      {job.company}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-slate-500">{job.role}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {job.dateApplied && (
                      <span className="hidden text-xs tabular-nums text-slate-400 sm:block">{formatDate(job.dateApplied)}</span>
                    )}
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_COLORS[job.status]}`}
                    >
                      {STATUS_LABELS[job.status]}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
