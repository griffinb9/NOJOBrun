'use client';

import { useEffect, useState } from 'react';
import {
  Flame, Plus, Mic, Clock, Zap, ChevronRight, TrendingUp, Target,
  Rocket, Sparkles,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { db } from '@/lib/db';
import { useAuth } from '@/lib/auth';
import { getRankProgress } from '@/lib/points';
import { Job, UserProgress, STATUS_LABELS } from '@/lib/types';
import { daysSince } from '@/lib/utils';
import { autoGhostStaleApplications } from '@/lib/autoGhost';
import { useMobileNav } from '@/lib/mobile-nav';
import JobFormModal from '@/components/jobs/JobFormModal';

const RANK_ICONS: Record<string, LucideIcon> = {
  'Underdog':      Rocket,
  'On the Rise':   TrendingUp,
  'Locked In':     Target,
  'Interview Pro': Mic,
  'Offer Season':  Sparkles,
};

interface FocusItem {
  icon: LucideIcon;
  text: string;
  tab?: 'jobs' | 'prep';
  accent: string;
}

function buildFocusItems(jobs: Job[]): FocusItem[] {
  const items: FocusItem[] = [];

  if (jobs.length === 0) {
    items.push({
      icon: Plus,
      text: 'Add your first application to get started.',
      tab: 'jobs',
      accent: 'text-violet-600',
    });
    return items;
  }

  // Upcoming interviews in the next 7 days
  const now = Date.now();
  const in7 = now + 7 * 86_400_000;
  const upcoming = jobs.find((j) =>
    j.interviewDates?.some((d) => {
      const t = new Date(d).getTime();
      return t >= now && t <= in7;
    })
  );
  if (upcoming) {
    const date = upcoming.interviewDates!.find((d) => {
      const t = new Date(d).getTime();
      return t >= now && t <= in7;
    })!;
    const daysUntil = Math.ceil((new Date(date).getTime() - now) / 86_400_000);
    items.push({
      icon: Mic,
      text: `Interview at ${upcoming.company} in ${daysUntil === 0 ? 'today' : `${daysUntil}d`} — review your prep.`,
      tab: 'prep',
      accent: 'text-violet-600',
    });
  }

  // Stale applied jobs (7+ days, no update)
  const stale = jobs.filter(
    (j) => j.status === 'applied' && daysSince(j.dateApplied ?? j.createdAt) >= 7
  );
  if (stale.length > 0) {
    items.push({
      icon: Clock,
      text: `${stale.length} application${stale.length > 1 ? 's' : ''} with no update in 7+ days — consider following up.`,
      tab: 'jobs',
      accent: 'text-amber-500',
    });
  }

  // No apps this week
  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const appsThisWeek = jobs.filter((j) => new Date(j.createdAt) >= weekStart).length;
  if (appsThisWeek === 0) {
    items.push({
      icon: Zap,
      text: 'No new applications this week — keep the streak alive.',
      tab: 'jobs',
      accent: 'text-blue-500',
    });
  }

  // If everything looks great
  if (items.length === 0) {
    items.push({
      icon: Flame,
      text: 'You\'re on track. Keep building momentum.',
      accent: 'text-stone-400',
    });
  }

  return items.slice(0, 3);
}

export default function MobileHome() {
  const { profile } = useAuth();
  const { setTab } = useMobileNav();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    async function load() {
      const [rawJobs, p] = await Promise.all([db.getJobs(), db.getUserProgress()]);
      const j = await autoGhostStaleApplications(rawJobs);
      setJobs(j);
      setProgress(p);
    }
    load();
  }, []);

  async function handleJobAdded() {
    setAddOpen(false);
    const rawJobs = await db.getJobs();
    setJobs(await autoGhostStaleApplications(rawJobs));
    const p = await db.getUserProgress();
    setProgress(p);
  }

  if (!profile || !progress) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-5 h-5 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const firstName = profile.fullName?.split(' ')[0] || 'there';
  const { current, next, progressPercent, pointsToNext } = getRankProgress(progress.totalPoints);
  const RankIcon = RANK_ICONS[current.name] ?? Rocket;
  const isMaxRank = !next;

  const total      = jobs.length;
  const active     = jobs.filter((j) => ['recruiter_screen', 'interviewing'].includes(j.status)).length;
  const offers     = jobs.filter((j) => j.status === 'offer').length;
  const focusItems = buildFocusItems(jobs);

  const weeklyPct = Math.min(100, Math.round((progress.weeklyPoints / progress.weeklyGoal) * 100));

  // Recent activity (last 3 updated jobs)
  const recent = [...jobs]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 3);

  return (
    <div className="min-h-full bg-stone-50">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="bg-white px-5 pt-8 pb-5 border-b border-stone-100">
        <p className="text-[11px] font-bold uppercase tracking-widest text-violet-400 mb-1">
          Hey, {firstName}
        </p>
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent leading-tight">
            Your Job Hunt
          </h1>
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-1.5 bg-gradient-to-r from-blue-500 to-violet-600 text-white px-3.5 py-2 rounded-xl text-sm font-semibold shrink-0 active:scale-95 transition-transform"
          >
            <Plus size={15} />
            Add Job
          </button>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">

        {/* ── Rank Card ──────────────────────────────────────────── */}
        <div
          className={`bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden`}
          style={{ boxShadow: '0 2px 16px rgba(124,58,237,0.09), 0 1px 3px rgba(0,0,0,0.05)' }}
        >
          <div className="h-[3px] w-full bg-gradient-to-r from-blue-400 to-violet-500" />
          <div className="px-5 pt-4 pb-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <RankIcon size={14} className={current.accentColor} strokeWidth={2.5} />
                <span className={`text-[11px] font-bold uppercase tracking-widest ${current.accentColor}`}>
                  Personal Rank
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black tabular-nums bg-gradient-to-r from-blue-500 to-violet-600 bg-clip-text text-transparent">
                  {progress.totalPoints}
                </span>
                <span className="text-xs text-stone-400 font-medium">pts</span>
              </div>
            </div>

            <h2 className="text-lg font-black text-stone-900 leading-tight">{current.name}</h2>
            <p className="text-xs text-stone-400 mt-0.5">{current.description}</p>

            {/* Rank progress bar */}
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] text-stone-400">
                  {isMaxRank
                    ? 'Max rank reached'
                    : `${pointsToNext} pts to ${next!.name}`}
                </span>
                <span className="text-[11px] font-bold text-violet-500">{progressPercent}%</span>
              </div>
              <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-400 to-violet-500 transition-all duration-700"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Weekly this week */}
            <div className="mt-3 pt-3 border-t border-stone-50 flex items-center justify-between">
              <span className="text-[11px] text-stone-400 font-medium">This week</span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-1 bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${weeklyPct >= 100 ? 'bg-emerald-400' : 'bg-gradient-to-r from-blue-400 to-violet-500'}`}
                    style={{ width: `${weeklyPct}%` }}
                  />
                </div>
                <span className="text-[11px] font-bold text-stone-500 tabular-nums">
                  {progress.weeklyPoints}/{progress.weeklyGoal}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Quick stats ─────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Applied', value: total, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Active',  value: active, color: 'text-violet-600', bg: 'bg-violet-50' },
            { label: 'Offers',  value: offers, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          ].map(({ label, value, color, bg }) => (
            <button
              key={label}
              onClick={() => setTab('jobs')}
              className={`${bg} rounded-2xl px-3 py-4 text-center active:scale-95 transition-transform`}
            >
              <div className={`text-2xl font-black tabular-nums leading-none ${color}`}>{value}</div>
              <div className="text-[11px] text-stone-500 mt-1.5 font-medium">{label}</div>
            </button>
          ))}
        </div>

        {/* ── Today's Focus ────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-stone-50">
            <h2 className="text-sm font-bold text-stone-800">Today's Focus</h2>
          </div>
          <div className="divide-y divide-stone-50">
            {focusItems.map((item, i) => (
              <button
                key={i}
                onClick={() => item.tab && setTab(item.tab)}
                disabled={!item.tab}
                className="w-full flex items-start gap-3 px-5 py-3.5 text-left hover:bg-stone-50 active:bg-stone-100 transition-colors disabled:cursor-default"
              >
                <item.icon size={15} className={`${item.accent} mt-0.5 shrink-0`} />
                <span className="text-sm text-stone-600 flex-1 leading-snug">{item.text}</span>
                {item.tab && <ChevronRight size={14} className="text-stone-300 mt-0.5 shrink-0" />}
              </button>
            ))}
          </div>
        </div>

        {/* ── Recent Activity ──────────────────────────────────────── */}
        {recent.length > 0 && (
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-50">
              <h2 className="text-sm font-bold text-stone-800">Recent</h2>
              <button
                onClick={() => setTab('jobs')}
                className="text-xs font-medium text-violet-600"
              >
                View all →
              </button>
            </div>
            <div className="divide-y divide-stone-50">
              {recent.map((job) => (
                <button
                  key={job.id}
                  onClick={() => setTab('jobs')}
                  className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-stone-50 active:bg-stone-100 transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-stone-800 truncate">{job.company}</p>
                    <p className="text-xs text-stone-400 truncate mt-0.5">{job.role}</p>
                  </div>
                  <span className="text-xs text-stone-400 shrink-0">{STATUS_LABELS[job.status]}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bottom padding */}
        <div className="h-2" />
      </div>

      <JobFormModal open={addOpen} onClose={handleJobAdded} />
    </div>
  );
}
