'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Flame } from 'lucide-react';
import { db } from '@/lib/db';
import { useAuth } from '@/lib/auth';
import { Job, STATUS_COLORS, STATUS_BORDER, STATUS_LABELS, UserProgress } from '@/lib/types';
import JobFormModal from './jobs/JobFormModal';
import RankCard from './dashboard/RankCard';
import { formatDate, daysSince, getDashboardTitle } from '@/lib/utils';
import { getRank } from '@/lib/points';

const GREETINGS = [
  "Let's get after it",
  "You're building momentum",
  "Stay locked in",
  "Big week ahead",
  "Every app counts",
];

export default function Dashboard() {
  const { profile } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [rankKey, setRankKey] = useState(0);
  const [greeting, setGreeting] = useState(GREETINGS[0]);

  useEffect(() => {
    async function loadData() {
      const [j, p] = await Promise.all([db.getJobs(), db.getUserProgress()]);
      setJobs(j);
      setProgress(p);
    }
    loadData();
  }, []);

  useEffect(() => {
    setGreeting(GREETINGS[Math.floor(Math.random() * GREETINGS.length)]);
  }, []);

  async function load() {
    const j = await db.getJobs();
    setJobs(j);
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
  const interviews = jobs.filter((j) => j.status === 'interviewing' || j.status === 'recruiter_screen').length;
  const offers = jobs.filter((j) => j.status === 'offer').length;
  const responseRate = total === 0 ? 0 : Math.round(((interviews + offers) / total) * 100);

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

  const subtitle = (() => {
    if (total === 0) return 'Add your first application to get started.';
    if (upcomingInterviews > 0)
      return `${upcomingInterviews} interview${upcomingInterviews !== 1 ? 's' : ''} coming up — go crush it.`;
    if (isStale) return `Last applied ${daysSinceLast} days ago. Time to get back out there.`;
    return `${total} application${total !== 1 ? 's' : ''} tracked and counting.`;
  })();

  const stats = [
    {
      label: 'Applications',
      value: total,
      valueClass: 'text-blue-600',
      dot: 'bg-blue-500',
    },
    {
      label: 'Response Rate',
      value: `${responseRate}%`,
      valueClass: 'text-violet-600',
      dot: 'bg-violet-500',
    },
    {
      label: 'Upcoming Interviews',
      value: upcomingInterviews,
      valueClass: upcomingInterviews > 0 ? 'text-emerald-600' : 'text-slate-400',
      dot: 'bg-emerald-500',
    },
    {
      label: 'Days Since Last App',
      value: daysSinceLast !== null ? daysSinceLast : '—',
      valueClass: isStale ? 'text-amber-500' : daysSinceLast !== null ? 'text-slate-600' : 'text-slate-400',
      dot: isStale ? 'bg-amber-400' : 'bg-slate-300',
    },
  ];

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto w-full">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="relative flex items-start justify-between gap-4 mb-10">
        {/* Background glow blob */}
        <div className="absolute -inset-x-4 -inset-y-3 rounded-2xl bg-gradient-to-br from-blue-500/[0.05] to-violet-500/[0.07] blur-2xl pointer-events-none" />

        <div className="relative">
          {/* Greeting eyebrow */}
          <p className="text-[11px] font-semibold uppercase tracking-widest text-violet-400/80 mb-2">
            {greeting}
          </p>

          {/* Title with icon */}
          <div className="flex items-center gap-2.5 group cursor-default">
            <Flame
              size={24}
              strokeWidth={2}
              className="text-violet-500 shrink-0 transition-all duration-200 group-hover:scale-110 group-hover:text-violet-400"
            />
            <h1 className="text-[2rem] font-extrabold tracking-tight leading-tight bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent transition-opacity duration-200 group-hover:opacity-80">
              {title}
            </h1>
          </div>

          {/* Rank + pts secondary line */}
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="text-xs font-semibold text-slate-500">{currentRank.name}</span>
            <span className="text-slate-300 text-xs">·</span>
            <span className="text-xs font-semibold text-violet-500">{progress.totalPoints} pts</span>
          </div>

          {/* Contextual subtitle */}
          <p className="text-stone-400 text-sm mt-2 leading-relaxed">{subtitle}</p>
        </div>

        <button
          onClick={() => setAddOpen(true)}
          className="relative flex items-center gap-2 bg-gradient-to-r from-blue-500 to-violet-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:from-blue-600 hover:to-violet-700 active:scale-[0.97] transition-all shrink-0 shadow-sm"
        >
          <Plus size={15} strokeWidth={2.5} />
          Add Job
        </button>
      </div>

      {/* ── Personal Rank ────────────────────────────────────────── */}
      <RankCard refreshKey={rankKey} />

      {/* ── Stats row ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-slate-100 rounded-2xl overflow-hidden shadow-sm mb-10">
        {stats.map(({ label, value, valueClass, dot }) => (
          <div key={label} className="bg-white px-5 py-5">
            <div className={`w-1.5 h-1.5 rounded-full mb-3 ${dot}`} />
            <div className={`text-2xl font-bold tabular-nums leading-none ${valueClass}`}>
              {value}
            </div>
            <div className="text-xs text-stone-400 mt-2 leading-snug">{label}</div>
          </div>
        ))}
      </div>

      {/* ── Recent Applications ───────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
          <h2 className="text-sm font-semibold text-stone-800 tracking-tight">
            Recent Applications
          </h2>
          <Link
            href="/tracker"
            className="text-xs font-medium text-violet-600 hover:text-violet-800 transition-colors"
          >
            View all →
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-stone-400 text-sm">No applications yet.</p>
            <button
              onClick={() => setAddOpen(true)}
              className="mt-3 text-sm font-medium text-violet-600 hover:text-violet-800 transition-colors"
            >
              Add your first application →
            </button>
          </div>
        ) : (
          <div>
            {recent.map((job) => (
              <div
                key={job.id}
                className={`flex items-center gap-4 px-6 py-4 border-b border-stone-100 last:border-0 hover:bg-slate-50/60 transition-colors border-l-4 ${STATUS_BORDER[job.status]}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-stone-800 text-sm truncate">
                    {job.company}
                  </div>
                  <div className="text-stone-400 text-xs truncate mt-0.5">{job.role}</div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {job.dateApplied && (
                    <span className="text-xs text-stone-300 hidden sm:block">
                      {formatDate(job.dateApplied)}
                    </span>
                  )}
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full border font-medium ${STATUS_COLORS[job.status]}`}
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
  );
}
