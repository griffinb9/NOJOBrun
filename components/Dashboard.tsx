'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { storage } from '@/lib/storage';
import { Job, UserProfile, STATUS_COLORS, STATUS_BORDER, STATUS_LABELS } from '@/lib/types';
import JobFormModal from './jobs/JobFormModal';
import RankCard from './dashboard/RankCard';
import ProfileSetupModal from './ui/ProfileSetupModal';
import { formatDate, daysSince, getDashboardTitle } from '@/lib/utils';

export default function Dashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [rankKey, setRankKey] = useState(0);
  const [profile, setProfile] = useState<UserProfile | null | undefined>(undefined);

  useEffect(() => {
    setJobs(storage.getJobs());
    setProfile(storage.getUserProfile());
  }, []);

  useEffect(() => {
    function onProfileUpdated() {
      const latest = storage.getUserProfile();
      if (latest) setProfile(latest);
    }
    window.addEventListener('nojob:profile-updated', onProfileUpdated);
    return () => window.removeEventListener('nojob:profile-updated', onProfileUpdated);
  }, []);

  function load() { setJobs(storage.getJobs()); }

  function handleJobAdded() {
    setAddOpen(false);
    load();
    setRankKey((k) => k + 1);
  }

  function handleProfileComplete(p: UserProfile) { setProfile(p); }

  if (profile === undefined) return null;
  if (profile === null) return <ProfileSetupModal onComplete={handleProfileComplete} />;

  const title = getDashboardTitle(profile.fullName);

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
      valueClass: 'text-stone-800',
    },
    {
      label: 'Response Rate',
      value: `${responseRate}%`,
      valueClass: responseRate > 0 ? 'text-violet-600' : 'text-stone-800',
    },
    {
      label: 'Upcoming Interviews',
      value: upcomingInterviews,
      valueClass: upcomingInterviews > 0 ? 'text-emerald-600' : 'text-stone-800',
    },
    {
      label: 'Days Since Last App',
      value: daysSinceLast !== null ? daysSinceLast : '—',
      valueClass: isStale ? 'text-amber-500' : 'text-stone-800',
    },
  ];

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto w-full">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 tracking-tight leading-tight">
            {title}
          </h1>
          <p className="text-stone-400 text-sm mt-2 leading-relaxed">{subtitle}</p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-violet-700 active:scale-[0.97] transition-all shrink-0 shadow-sm"
        >
          <Plus size={15} strokeWidth={2.5} />
          Add Job
        </button>
      </div>

      {/* ── Personal Rank ────────────────────────────────────────── */}
      <RankCard refreshKey={rankKey} />

      {/* ── Stats row ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-stone-100 rounded-2xl overflow-hidden shadow-sm mb-10">
        {stats.map(({ label, value, valueClass }) => (
          <div key={label} className="bg-white px-5 py-5">
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
                className={`flex items-center gap-4 px-6 py-4 border-b border-stone-50 last:border-0 border-l-4 ${STATUS_BORDER[job.status]}`}
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
