'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Briefcase, TrendingUp, Calendar, Clock } from 'lucide-react';
import { storage } from '@/lib/storage';
import { Job, UserProfile, STATUS_COLORS, STATUS_BORDER } from '@/lib/types';
import JobFormModal from './jobs/JobFormModal';
import RankCard from './dashboard/RankCard';
import ProfileSetupModal from './ui/ProfileSetupModal';
import { formatDate, daysSince, getDashboardTitle } from '@/lib/utils';

export default function Dashboard() {
  // ── All hooks unconditionally at the top ─────────────────────────────────
  const [jobs, setJobs] = useState<Job[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [rankKey, setRankKey] = useState(0);
  // undefined = hydrating | null = no profile yet | UserProfile = ready
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
  // ─────────────────────────────────────────────────────────────────────────

  function load() {
    setJobs(storage.getJobs());
  }

  function handleJobAdded() {
    setAddOpen(false);
    load();
    setRankKey((k) => k + 1);
  }

  function handleProfileComplete(p: UserProfile) {
    setProfile(p);
  }

  // Conditional returns — safe here because all hooks have already been called
  if (profile === undefined) return null;
  if (profile === null) {
    return <ProfileSetupModal onComplete={handleProfileComplete} />;
  }

  const title = getDashboardTitle(profile.fullName);

  const total = jobs.length;
  const interviews = jobs.filter((j) => j.status === 'interviewing').length;
  const offers = jobs.filter((j) => j.status === 'offer').length;
  const responseRate =
    total === 0 ? 0 : Math.round(((interviews + offers) / total) * 100);

  const upcomingInterviews = jobs.filter((j) => {
    if (!j.interviewDates || j.interviewDates.length === 0) return false;
    return j.interviewDates.some((d) => new Date(d) >= new Date());
  }).length;

  const lastApplied = jobs
    .filter((j) => j.dateApplied)
    .sort((a, b) => new Date(b.dateApplied!).getTime() - new Date(a.dateApplied!).getTime())[0];

  const daysSinceLast = lastApplied?.dateApplied ? daysSince(lastApplied.dateApplied) : null;

  const recent = [...jobs]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  const metrics = [
    { label: 'Total Applications', value: total, icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Response Rate', value: `${responseRate}%`, icon: TrendingUp, color: 'text-violet-600', bg: 'bg-violet-50' },
    { label: 'Upcoming Interviews', value: upcomingInterviews, icon: Calendar, color: 'text-green-600', bg: 'bg-green-50' },
    {
      label: 'Days Since Last App',
      value: daysSinceLast !== null ? daysSinceLast : '—',
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
  ];

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">{title}</h1>
          <p className="text-stone-400 text-sm mt-0.5">Your job search at a glance</p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors"
        >
          <Plus size={16} />
          Add Job
        </button>
      </div>

      {/* Personal Rank */}
      <RankCard refreshKey={rankKey} />

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {metrics.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100">
            <div className={`inline-flex p-2 rounded-xl ${bg} mb-3`}>
              <Icon size={18} className={color} />
            </div>
            <div className="text-2xl font-bold text-stone-800">{value}</div>
            <div className="text-xs text-stone-400 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Recent jobs */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <h2 className="font-semibold text-stone-700">Recent Applications</h2>
          <Link href="/tracker" className="text-xs text-violet-600 hover:underline">
            View all
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-stone-400 text-sm">No applications yet.</p>
            <button
              onClick={() => setAddOpen(true)}
              className="mt-3 text-violet-600 text-sm font-medium hover:underline"
            >
              Add your first application →
            </button>
          </div>
        ) : (
          <div className="divide-y divide-stone-50">
            {recent.map((job) => (
              <div
                key={job.id}
                className={`flex items-center gap-4 px-5 py-3.5 border-l-4 ${STATUS_BORDER[job.status]}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-stone-800 text-sm truncate">{job.company}</div>
                  <div className="text-stone-400 text-xs truncate">{job.role}</div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {job.dateApplied && (
                    <span className="text-xs text-stone-400">{formatDate(job.dateApplied)}</span>
                  )}
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border capitalize ${STATUS_COLORS[job.status]}`}
                  >
                    {job.status}
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
