'use client';

import { useEffect, useState, useRef } from 'react';
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
import JobFormModal from './jobs/JobFormModal';
import RankCard from './dashboard/RankCard';
import UserAvatar from '@/components/ui/UserAvatar';
import { computeJobStreak } from '@/lib/job-streak';
import { formatDate, daysSince, getDashboardTitle } from '@/lib/utils';
import { getRank } from '@/lib/points';
import { autoGhostStaleApplications } from '@/lib/autoGhost';
import type { LucideIcon } from 'lucide-react';

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
  const [jobs, setJobs] = useState<Job[]>([]);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [rankKey, setRankKey] = useState(0);
  const [greeting] = useState(() => GREETINGS[Math.floor(Math.random() * GREETINGS.length)]);

  useEffect(() => {
    async function loadData() {
      const [rawJobs, p] = await Promise.all([db.getJobs(), db.getUserProgress()]);
      const j = await autoGhostStaleApplications(rawJobs);
      const progress = await db.syncJobStreakFromJobs(j, p);
      setJobs(j);
      setProgress(progress);
    }
    loadData();
  }, []);

  async function load() {
    const j = await db.getJobs();
    setJobs(j);
    setProgress(await db.syncJobStreakFromJobs(j));
  }

  function handleJobAdded() {
    setAddOpen(false);
    load();
    setRankKey((k) => k + 1);
  }

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
    <div className="relative min-h-full w-full overflow-hidden">
      {/* Atmosphere */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#e8ebf6] via-slate-100 to-[#d4ddf2]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_125%_75%_at_50%_-5%,rgba(99,102,241,0.11),transparent_58%),radial-gradient(ellipse_85%_55%_at_100%_45%,rgba(56,189,248,0.07),transparent_52%),radial-gradient(ellipse_60%_45%_at_0%_95%,rgba(245,185,66,0.06),transparent_55%),radial-gradient(ellipse_50%_35%_at_85%_100%,rgba(139,92,246,0.05),transparent_50%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/25 to-transparent opacity-60"
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 dashboard-noise-overlay" aria-hidden />

      {/* Floating particles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        {[
          ['10%', '22%', 'h-1.5 w-1.5'],
          ['78%', '18%', 'h-2 w-2'],
          ['88%', '62%', 'h-1 w-1'],
          ['18%', '72%', 'h-1.5 w-1.5'],
          ['52%', '38%', 'h-2 w-2'],
          ['66%', '85%', 'h-1 w-1'],
        ].map(([left, top, size], i) => (
          <span
            key={i}
            className={`dashboard-particle absolute rounded-full bg-gradient-to-br from-indigo-400/50 to-violet-300/35 blur-[0.5px] ${size}`}
            style={{ left, top, animationDelay: particleDelays[i] ?? '0s' }}
          />
        ))}
      </div>

      <div className="relative z-[1] mx-auto w-full max-w-5xl p-6 md:p-10">

        {!profile.username?.trim() && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-2xl border border-indigo-200/90 bg-white/80 px-4 py-3 text-sm text-slate-800 shadow-[0_8px_32px_-12px_rgba(99,102,241,0.18)] backdrop-blur-md"
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

        {/* Hero — command center */}
        <div className="relative mb-8 flex flex-wrap items-start justify-between gap-x-4 gap-y-4 md:mb-10">
          <div
            className="dashboard-header-ambient pointer-events-none absolute -left-8 -top-6 h-44 w-[min(100%,32rem)] rounded-[2rem] bg-gradient-to-r from-indigo-500/18 via-violet-500/14 to-[#F5B942]/12 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -left-4 top-0 h-32 w-40 rounded-full bg-sky-400/12 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute left-[40%] top-8 h-24 w-56 rounded-full bg-violet-500/10 blur-2xl"
            aria-hidden
          />

          <motion.div
            className="relative max-w-[min(100%,28rem)] md:max-w-xl"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="relative overflow-hidden rounded-2xl border border-white/50 bg-white/40 px-4 py-3 shadow-[0_12px_40px_-16px_rgba(49,46,129,0.14)] ring-1 ring-indigo-100/60 backdrop-blur-md sm:px-5 sm:py-3.5">
              <span
                className="dashboard-hero-shimmer pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/50 to-transparent"
                aria-hidden
              />
              <p className="relative text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500 sm:text-[11px]">
                {greeting}
              </p>
            </div>

            <div className="relative mt-4 flex min-w-0 cursor-default items-start gap-3 sm:items-center sm:gap-3.5">
              <motion.div
                whileHover={{ scale: 1.04 }}
                transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                className="shrink-0"
              >
                <UserAvatar
                  src={profile.avatarUrl}
                  fullName={profile.fullName}
                  displayName={profile.displayName}
                  username={profile.username}
                  size="lg"
                  className="ring-2 ring-indigo-200/80 shadow-[0_8px_24px_-6px_rgba(99,102,241,0.35)]"
                />
              </motion.div>
              <div className="min-w-0 flex-1">
                <div className="relative">
                  <span
                    className="pointer-events-none absolute -inset-x-1 -inset-y-1 bg-gradient-to-r from-indigo-500/8 via-violet-500/12 to-sky-500/8 blur-xl"
                    aria-hidden
                  />
                  <h1 className="relative break-words text-2xl font-black leading-[1.08] tracking-[-0.03em] sm:text-4xl md:text-[2.35rem] md:leading-[1.06]">
                    <span className="bg-gradient-to-r from-slate-900 via-indigo-800 to-violet-900 bg-clip-text text-transparent">
                      {title}
                    </span>
                  </h1>
                </div>
              </div>
            </div>

            <motion.div
              className="mt-3 flex flex-wrap items-center gap-2"
              variants={containerVariants}
              initial="hidden"
              animate="show"
            >
              <motion.span
                variants={itemVariants}
                className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200/90 bg-white/90 px-3 py-1 text-xs font-bold text-slate-800 shadow-sm shadow-indigo-500/10 ring-1 ring-white/80 backdrop-blur-sm"
              >
                <Sparkles size={12} className="text-amber-500" strokeWidth={2.5} />
                {currentRank.name}
              </motion.span>
              <motion.span variants={itemVariants} className="text-slate-300 text-xs">
                ·
              </motion.span>
              <motion.span
                variants={itemVariants}
                className="bg-gradient-to-r from-slate-900 via-indigo-800 to-violet-800 bg-clip-text text-xs font-black tabular-nums text-transparent drop-shadow-[0_0_14px_rgba(99,102,241,0.2)]"
              >
                {progress.totalPoints} pts
              </motion.span>
            </motion.div>

            <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-600">{subtitle}</p>
          </motion.div>

          <motion.button
            type="button"
            onClick={() => setAddOpen(true)}
            className="relative flex shrink-0 items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-slate-900 via-indigo-600 to-violet-700 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_36px_-8px_rgba(99,102,241,0.45)] outline-none ring-1 ring-white/15"
            whileHover={{
              scale: 1.03,
              boxShadow: '0 16px 44px -8px rgba(99,102,241,0.4), 0 0 40px rgba(245,185,66,0.15)',
            }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 22 }}
          >
            <span
              className="pointer-events-none absolute inset-0 bg-gradient-to-r from-amber-300/0 via-amber-200/15 to-white/0 opacity-0 transition-opacity duration-500 hover:opacity-100"
              aria-hidden
            />
            <Plus size={15} strokeWidth={2.5} />
            Add Job
          </motion.button>
        </div>

        <RankCard refreshKey={rankKey} streakSummary={streakSummary} />

        {/* Stats */}
        <motion.div
          className="mb-10 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4"
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-40px' }}
        >
          {stats.map((s) => (
            <motion.div
              key={s.label}
              variants={itemVariants}
              whileHover={{ y: -5, transition: { type: 'spring', stiffness: 400, damping: 22 } }}
              whileTap={{ scale: 0.99 }}
              className={`
                group relative overflow-hidden rounded-2xl border bg-white/85 p-4 shadow-[0_4px_24px_-8px_rgba(15,23,42,0.08)] backdrop-blur-md transition-shadow duration-300
                before:pointer-events-none before:absolute before:inset-x-3 before:top-0 before:z-[1] before:h-px before:rounded-full before:bg-gradient-to-r before:from-transparent before:via-[#E9A93D]/30 before:to-transparent
                hover:border-indigo-200/90 hover:bg-white/95 hover:shadow-[0_12px_40px_-12px_rgba(99,102,241,0.16),0_0_36px_rgba(245,185,66,0.08)]
                ${s.warn ? 'border-amber-200/95 ring-1 ring-amber-400/25' : 'border-slate-200/75 ring-1 ring-indigo-100/40'}
              `}
            >
              {s.trend === 'positive' && (
                <span className="pointer-events-none absolute right-3 top-3 text-indigo-400/50 transition-colors group-hover:text-indigo-500/70">
                  <ArrowUpRight size={14} strokeWidth={2.5} />
                </span>
              )}
              <div
                className={`relative mb-3 inline-flex rounded-xl bg-gradient-to-br p-2.5 ring-1 ${s.iconBg}`}
              >
                <s.icon size={18} strokeWidth={2.1} />
              </div>
              <div
                className={`text-[1.65rem] font-black tabular-nums leading-none tracking-tight sm:text-[1.95rem] ${s.valueClass}`}
              >
                <StatValue value={s.value} />
              </div>
              <div
                className={`mt-2 text-[10px] font-bold uppercase leading-snug tracking-wide sm:text-[11px] ${s.subAccent ?? 'text-slate-500'}`}
              >
                {s.label}
              </div>
              {s.warn && (
                <p className="mt-1.5 text-[10px] font-medium text-amber-700/90">Time to send more apps</p>
              )}
            </motion.div>
          ))}
        </motion.div>

        {/* Recent Applications */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-20px' }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-2xl border border-indigo-100/90 bg-white/90 shadow-[0_12px_40px_-16px_rgba(49,46,129,0.12)] backdrop-blur-md transition-shadow duration-300 before:pointer-events-none before:absolute before:inset-x-5 before:top-0 before:z-[1] before:h-px before:rounded-full before:bg-gradient-to-r before:from-transparent before:via-[#E9A93D]/28 before:to-transparent hover:shadow-[0_16px_48px_-12px_rgba(99,102,241,0.14)] md:before:inset-x-6"
        >
          <div className="flex items-center justify-between border-b border-indigo-100/70 bg-gradient-to-r from-white via-indigo-50/40 to-amber-50/25 px-5 py-4 md:px-6">
            <h2 className="text-sm font-bold tracking-tight bg-gradient-to-r from-slate-900 to-indigo-900 bg-clip-text text-transparent">
              Recent applications
            </h2>
            <Link
              href="/tracker"
              className="text-xs font-semibold text-indigo-700 transition hover:text-violet-800"
            >
              View all →
            </Link>
          </div>

          {recent.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-sm text-slate-400">No applications yet.</p>
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="mt-3 text-sm font-semibold text-indigo-700 transition-colors hover:text-indigo-900"
              >
                Add your first application →
              </button>
            </div>
          ) : (
            <div>
              {recent.map((job, idx) => (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, x: -8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.04, duration: 0.3 }}
                  className={`flex items-center gap-3 border-b border-slate-100/90 px-4 py-3.5 transition-colors last:border-0 hover:bg-indigo-50/50 md:px-6 md:py-4 border-l-4 ${STATUS_BORDER[job.status]}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-slate-800">{job.company}</div>
                    <div className="mt-0.5 truncate text-xs text-slate-500">{job.role}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {job.dateApplied && (
                      <span className="hidden text-xs text-slate-400 sm:block">{formatDate(job.dateApplied)}</span>
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

        <JobFormModal open={addOpen} onClose={handleJobAdded} />
      </div>
    </div>
  );
}
