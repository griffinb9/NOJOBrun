'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  Flame,
  Briefcase,
  Percent,
  CalendarDays,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { db } from '@/lib/db';
import { useAuth } from '@/lib/auth';
import { Job, STATUS_COLORS, STATUS_BORDER, STATUS_LABELS, UserProgress } from '@/lib/types';
import JobFormModal from './jobs/JobFormModal';
import RankCard from './dashboard/RankCard';
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
};

export default function Dashboard() {
  const { profile } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [rankKey, setRankKey] = useState(0);
  const [greeting, setGreeting] = useState(GREETINGS[0]);

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

  useEffect(() => {
    setGreeting(GREETINGS[Math.floor(Math.random() * GREETINGS.length)]);
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
        'from-sky-500/16 via-[#FFFAF0]/40 to-blue-600/14 text-sky-800 ring-sky-500/22',
      valueClass:
        'bg-gradient-to-br from-slate-900 via-indigo-700 to-violet-900 bg-clip-text text-transparent drop-shadow-[0_1px_2px_rgba(15,23,42,0.1),0_0_22px_rgba(99,102,241,0.16)]',
    },
    {
      label: 'Response rate',
      value: `${responseRate}%`,
      icon: Percent,
      iconBg:
        'from-indigo-500/14 via-[#FFF8ED]/35 to-violet-500/12 text-indigo-800 ring-indigo-500/20',
      valueClass:
        'bg-gradient-to-br from-slate-900 via-indigo-700 to-violet-950 bg-clip-text text-transparent drop-shadow-[0_1px_2px_rgba(15,23,42,0.1),0_0_24px_rgba(99,102,241,0.18)]',
    },
    {
      label: 'Upcoming interviews',
      value: upcomingInterviews,
      icon: CalendarDays,
      iconBg: upcomingInterviews > 0
        ? 'from-emerald-500/30 to-teal-500/20 text-emerald-700 ring-emerald-500/30'
        : 'from-slate-400/14 via-[#FFFAF0]/18 to-slate-500/10 text-slate-500 ring-slate-400/15',
      valueClass:
        upcomingInterviews > 0
          ? 'bg-gradient-to-br from-emerald-800 via-teal-700 to-emerald-950 bg-clip-text text-transparent drop-shadow-[0_1px_2px_rgba(6,78,59,0.1),0_0_20px_rgba(16,185,129,0.14)]'
          : 'text-slate-400',
      subAccent: upcomingInterviews > 0 ? 'text-emerald-700/85' : undefined,
    },
    {
      label: 'Days since last app',
      value: daysSinceLast !== null ? daysSinceLast : '—',
      icon: isStale ? AlertTriangle : Clock,
      iconBg: isStale
        ? 'from-amber-500/25 to-orange-500/20 text-amber-600 ring-amber-500/30'
        : 'from-slate-400/14 via-[#FFFAF0]/25 to-slate-500/10 text-slate-600 ring-slate-400/15',
      valueClass: isStale
        ? 'bg-gradient-to-br from-amber-800 via-orange-600 to-amber-950 bg-clip-text text-transparent drop-shadow-[0_1px_2px_rgba(120,53,15,0.1),0_0_18px_rgba(245,158,11,0.18)]'
        : daysSinceLast !== null
          ? 'bg-gradient-to-br from-slate-900 via-indigo-700 to-violet-900 bg-clip-text text-transparent drop-shadow-[0_1px_2px_rgba(15,23,42,0.1),0_0_22px_rgba(99,102,241,0.15)]'
          : 'text-slate-400',
      warn: isStale,
    },
  ];

  return (
    <div className="relative min-h-full w-full overflow-hidden">
      {/* Soft page tint — light, cohesive with streak / rank */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#eceef5] via-slate-100 to-[#dbe2f4]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_70%_at_50%_-8%,rgba(79,70,229,0.085),transparent_55%),radial-gradient(ellipse_90%_55%_at_100%_60%,rgba(56,189,248,0.05),transparent_50%),radial-gradient(ellipse_55%_40%_at_0%_100%,rgba(245,185,66,0.055),transparent_55%)]"
        aria-hidden
      />

      <div className="relative p-6 md:p-10 max-w-5xl mx-auto w-full">

        {!profile.username?.trim() && (
          <div className="mb-6 rounded-2xl border border-indigo-200/80 bg-white/90 px-4 py-3 text-sm text-slate-800 shadow-sm shadow-indigo-500/10 backdrop-blur-sm">
            <p className="font-semibold text-indigo-900">Choose a username to unlock Friends</p>
            <p className="text-slate-600 mt-1 text-xs leading-relaxed">
              Your applications and prep stay private. Friends only see rank, points, streaks, and achievements.
            </p>
            <Link
              href="/profile"
              className="inline-flex mt-2 text-xs font-bold text-indigo-600 hover:text-indigo-800"
            >
              Set username in Profile →
            </Link>
          </div>
        )}

        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="relative flex flex-wrap items-start justify-between gap-x-4 gap-y-3 mb-8 md:mb-10">
          <div
            className="dashboard-header-ambient pointer-events-none absolute -left-6 -top-4 h-36 w-[min(100%,28rem)] rounded-3xl bg-gradient-to-r from-indigo-500/14 via-violet-500/12 to-[#F5B942]/10 blur-2xl"
            aria-hidden
          />

          <div className="relative">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-2">
              {greeting}
            </p>

            <div className="group flex cursor-default items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/85 ring-1 ring-indigo-200/70 shadow-md shadow-indigo-500/15 transition-all duration-300 group-hover:shadow-[0_8px_28px_-4px_rgba(99,102,241,0.2),0_0_24px_rgba(245,185,66,0.18)] group-hover:ring-[#E9A93D]/35">
                <Flame
                  size={22}
                  strokeWidth={2}
                  className="shrink-0 text-indigo-600 drop-shadow-[0_0_10px_rgba(99,102,241,0.3),0_0_14px_rgba(233,169,61,0.2)] transition-transform duration-300 group-hover:scale-110"
                />
              </div>
              <h1
                className="text-2xl md:text-[2rem] font-extrabold tracking-tight leading-tight bg-gradient-to-r from-slate-900 via-indigo-700 to-violet-800 bg-clip-text text-transparent drop-shadow-[0_0_28px_rgba(99,102,241,0.12)] transition-all duration-300"
              >
                {title}
              </h1>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-indigo-200/85 bg-white/92 px-2.5 py-0.5 text-xs font-semibold text-slate-800 shadow-sm shadow-indigo-500/10 ring-1 ring-indigo-100/70 backdrop-blur-sm">
                {currentRank.name}
              </span>
              <span className="text-slate-300 text-xs">·</span>
              <span className="bg-gradient-to-r from-slate-900 via-indigo-800 to-violet-800 bg-clip-text text-xs font-black tabular-nums text-transparent drop-shadow-[0_0_14px_rgba(99,102,241,0.22)]">
                {progress.totalPoints} pts
              </span>
            </div>

            <p className="text-slate-500 text-sm mt-2.5 max-w-md leading-relaxed">{subtitle}</p>
          </div>

          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="relative flex shrink-0 items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-slate-900 via-indigo-600 to-indigo-700 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 outline-none transition-all duration-200 hover:scale-[1.02] hover:from-slate-900 hover:via-indigo-600 hover:to-violet-700 hover:shadow-[0_12px_40px_-8px_rgba(99,102,241,0.35),0_0_32px_rgba(245,185,66,0.22)] focus-visible:shadow-[0_12px_40px_-8px_rgba(99,102,241,0.32),0_0_36px_rgba(245,185,66,0.28)] focus-visible:ring-2 focus-visible:ring-[#E9A93D]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#eceef5] active:scale-[0.98]"
          >
            <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#FFB84D]/0 via-[#FFB84D]/12 to-white/0 opacity-0 transition-opacity duration-500 hover:opacity-100" />
            <Plus size={15} strokeWidth={2.5} />
            Add Job
          </button>
        </div>

        <RankCard refreshKey={rankKey} streakSummary={streakSummary} />

        {/* ── Stats ───────────────────────────────────────────────── */}
        <div className="mb-10 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className={`
                group relative overflow-hidden rounded-2xl border bg-white/92 p-4 shadow-sm shadow-slate-900/[0.04] backdrop-blur-md transition-all duration-300 ease-out
                before:pointer-events-none before:absolute before:left-3 before:right-3 before:top-0 before:z-[1] before:h-px before:rounded-full before:bg-gradient-to-r before:from-transparent before:via-[#E9A93D]/24 before:to-transparent
                hover:-translate-y-1 hover:bg-white hover:shadow-[0_8px_28px_-6px_rgba(99,102,241,0.12),0_0_28px_rgba(245,185,66,0.1)]
                ${s.warn ? 'border-amber-200/90 ring-1 ring-amber-400/28' : 'border-slate-200/80 ring-1 ring-indigo-100/50'}
              `}
            >
              <div
                className={`mb-3 inline-flex rounded-xl bg-gradient-to-br p-2 ring-1 ${s.iconBg}`}
              >
                <s.icon size={18} strokeWidth={2.1} />
              </div>
              <div
                className={`text-[1.75rem] sm:text-[2rem] font-black tabular-nums leading-none tracking-tight ${s.valueClass}`}
              >
                {s.value}
              </div>
              <div
                className={`mt-2 text-[11px] font-semibold uppercase tracking-wide leading-snug ${s.subAccent ?? 'text-slate-500'}`}
              >
                {s.label}
              </div>
              {s.warn && (
                <p className="mt-1.5 text-[10px] font-medium text-amber-600/90">Time to send more apps</p>
              )}
            </div>
          ))}
        </div>

        {/* ── Recent Applications ───────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl border border-indigo-100/90 bg-white/96 shadow-md shadow-indigo-500/[0.07] backdrop-blur-md transition-shadow duration-300 before:pointer-events-none before:absolute before:inset-x-5 before:top-0 before:z-[1] before:h-px before:rounded-full before:bg-gradient-to-r before:from-transparent before:via-[#E9A93D]/26 before:to-transparent hover:shadow-lg hover:shadow-indigo-500/12 md:before:inset-x-6">
          <div className="flex items-center justify-between border-b border-indigo-100/60 bg-gradient-to-r from-white via-indigo-50/35 to-[rgba(255,248,235,0.55)] px-5 py-4 md:px-6">
            <h2 className="text-sm font-bold tracking-tight bg-gradient-to-r from-slate-900 to-indigo-900 bg-clip-text text-transparent">
              Recent applications
            </h2>
            <Link
              href="/tracker"
              className="text-xs font-semibold text-indigo-700 drop-shadow-[0_0_12px_rgba(99,102,241,0.18),0_0_14px_rgba(233,169,61,0.08)] transition-colors hover:text-violet-800 hover:drop-shadow-[0_0_16px_rgba(245,185,66,0.2)]"
            >
              View all →
            </Link>
          </div>

          {recent.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-slate-400 text-sm">No applications yet.</p>
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="mt-3 text-sm font-semibold text-indigo-700 transition-colors hover:text-indigo-900 hover:drop-shadow-[0_0_12px_rgba(245,185,66,0.18)]"
              >
                Add your first application →
              </button>
            </div>
          ) : (
            <div>
              {recent.map((job) => (
                <div
                  key={job.id}
                  className={`flex items-center gap-3 border-b border-slate-100/80 px-4 py-3.5 transition-colors last:border-0 hover:bg-indigo-50/45 hover:shadow-[inset_0_0_0_1px_rgba(233,169,61,0.07)] md:px-6 md:py-4 border-l-4 ${STATUS_BORDER[job.status]}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-slate-800">
                      {job.company}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-slate-500">{job.role}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {job.dateApplied && (
                      <span className="hidden text-xs text-slate-400 sm:block">
                        {formatDate(job.dateApplied)}
                      </span>
                    )}
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_COLORS[job.status]}`}
                    >
                      {STATUS_LABELS[job.status]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <JobFormModal open={addOpen} onClose={handleJobAdded} />
      </div>
    </div>
  );
}
