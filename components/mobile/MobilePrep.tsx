'use client';

import { useEffect, useState } from 'react';
import { FileText, ChevronRight, Loader2, Mic } from 'lucide-react';
import Link from 'next/link';
import { Job, STATUS_LABELS, JobStatus } from '@/lib/types';
import { db } from '@/lib/db';
import { autoGhostStaleApplications } from '@/lib/autoGhost';

// Jobs in these statuses are most relevant for prep
const PREP_PRIORITY: JobStatus[] = ['interviewing', 'recruiter_screen', 'offer', 'applied', 'ghosted', 'rejected'];

const STATUS_ACCENT: Record<JobStatus, string> = {
  interviewing:     'bg-violet-500',
  recruiter_screen: 'bg-sky-400',
  offer:            'bg-emerald-500',
  applied:          'bg-blue-400',
  ghosted:          'bg-stone-300',
  rejected:         'bg-red-400',
};

const PREP_TAGLINE: Partial<Record<JobStatus, string>> = {
  interviewing:     'Interview coming up — get prepped.',
  recruiter_screen: 'Screen — know your story.',
  offer:            'Offer stage — be ready to negotiate.',
  applied:          'Applied — stay ahead.',
};

export default function MobilePrep() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const raw = await db.getJobs();
      const ghosted = await autoGhostStaleApplications(raw);
      // Sort by prep priority
      const sorted = [...ghosted].sort((a, b) => {
        const ai = PREP_PRIORITY.indexOf(a.status);
        const bi = PREP_PRIORITY.indexOf(b.status);
        return ai - bi;
      });
      setJobs(sorted);
      setLoading(false);
    }
    load();
  }, []);

  const activeJobs = jobs.filter((j) => ['interviewing', 'recruiter_screen', 'offer'].includes(j.status));
  const otherJobs  = jobs.filter((j) => !['interviewing', 'recruiter_screen', 'offer'].includes(j.status));

  return (
    <div className="min-h-full bg-stone-50">
      {/* Header */}
      <div className="bg-white px-5 pt-8 pb-5 border-b border-stone-100">
        <h1 className="text-2xl font-extrabold tracking-tight text-stone-900">Interview Prep</h1>
        <p className="text-sm text-stone-400 mt-1">AI-generated prep kits for every role.</p>
      </div>

      <div className="px-4 py-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={20} className="animate-spin text-violet-400" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-16">
            <FileText size={28} className="text-stone-300 mx-auto mb-3" />
            <p className="text-stone-400 text-sm">No jobs tracked yet.</p>
            <p className="text-xs text-stone-300 mt-1">Add a job in the Jobs tab to generate prep.</p>
          </div>
        ) : (
          <>
            {activeJobs.length > 0 && (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-violet-500 mb-2 px-1">
                  Active
                </p>
                <div className="space-y-2">
                  {activeJobs.map((job) => (
                    <PrepJobCard key={job.id} job={job} highlighted />
                  ))}
                </div>
              </div>
            )}

            {otherJobs.length > 0 && (
              <div>
                {activeJobs.length > 0 && (
                  <p className="text-[11px] font-bold uppercase tracking-widest text-stone-400 mb-2 px-1">
                    Other
                  </p>
                )}
                <div className="space-y-2">
                  {otherJobs.map((job) => (
                    <PrepJobCard key={job.id} job={job} highlighted={false} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        <div className="h-4" />
      </div>
    </div>
  );
}

function PrepJobCard({ job, highlighted }: { job: Job; highlighted: boolean }) {
  const tagline = PREP_TAGLINE[job.status];

  return (
    <Link
      href={`/prep/${job.id}`}
      className={`block bg-white rounded-2xl border shadow-sm overflow-hidden active:scale-[0.98] transition-transform ${
        highlighted ? 'border-violet-100' : 'border-stone-100'
      }`}
    >
      <div className={`h-0.5 w-full ${STATUS_ACCENT[job.status]}`} />
      <div className="px-4 py-4 flex items-center gap-3">
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            highlighted ? 'bg-violet-50' : 'bg-stone-50'
          }`}
        >
          <Mic size={16} className={highlighted ? 'text-violet-500' : 'text-stone-400'} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-stone-900 truncate">{job.company}</p>
          <p className="text-xs text-stone-400 truncate mt-0.5">{job.role}</p>
          {tagline && (
            <p className="text-[11px] text-violet-500 font-medium mt-1 leading-tight">{tagline}</p>
          )}
          {!tagline && (
            <p className="text-[11px] text-stone-300 mt-1">{STATUS_LABELS[job.status]}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-xs font-semibold text-violet-600">Open</span>
          <ChevronRight size={14} className="text-violet-400" />
        </div>
      </div>
    </Link>
  );
}
