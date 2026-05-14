'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus, ChevronDown, FileText, StickyNote, Pencil, Check,
  X, Loader2, Search,
} from 'lucide-react';
import Link from 'next/link';
import { Job, JobStatus, KANBAN_COLUMNS, STATUS_COLORS, STATUS_LABELS } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { normalizeTrackerColumnOrder } from '@/lib/trackerColumns';
import { now } from '@/lib/utils';
import { awardPoints } from '@/lib/points';
import { autoGhostStaleApplications } from '@/lib/autoGhost';
import { jobMatchesTrackerSearch } from '@/lib/jobSearch';
import { formatDate } from '@/lib/utils';
import JobFormModal from '@/components/jobs/JobFormModal';
import { useOpenAddJob } from '@/components/jobs/JobAddModalProvider';
import { subscribeJobsMutated } from '@/lib/jobsMutateEvents';
import { useAchievementLevelUpRequest } from '@/components/achievements/AchievementLevelUpProvider';

type Filter = 'all' | JobStatus;

const FILTERS: { id: Filter; label: string; short: string }[] = [
  { id: 'all',              label: 'All',         short: 'All'       },
  { id: 'applied',          label: 'Applied',     short: 'Applied'   },
  { id: 'recruiter_screen', label: 'Screen',      short: 'Screen'    },
  { id: 'interviewing',     label: 'Interviewing',short: 'Interview' },
  { id: 'offer',            label: 'Offer',       short: 'Offer'     },
  { id: 'rejected',         label: 'Rejected',    short: 'Rejected'  },
  { id: 'ghosted',          label: 'Ghosted',     short: 'Ghosted'   },
];

const STATUS_DOT: Record<JobStatus, string> = {
  applied:          'bg-blue-400',
  recruiter_screen: 'bg-sky-400',
  interviewing:     'bg-violet-500',
  offer:            'bg-emerald-500',
  rejected:         'bg-red-400',
  ghosted:          'bg-stone-300',
};

export default function MobileJobs() {
  const { profile } = useAuth();
  const openAddJob = useOpenAddJob();
  const requestAchievementLevelCheck = useAchievementLevelUpRequest();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [editJob, setEditJob] = useState<Job | null>(null);
  const [statusPickerJob, setStatusPickerJob] = useState<Job | null>(null);
  const [jobSearch, setJobSearch] = useState('');

  const load = useCallback(async () => {
    const raw = await db.getJobs();
    const ghosted = await autoGhostStaleApplications(raw);
    setJobs(ghosted);
    setLoading(false);
    void requestAchievementLevelCheck();
  }, [requestAchievementLevelCheck]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    return subscribeJobsMutated(() => {
      void load();
    });
  }, [load]);

  const filterTabs = useMemo(() => {
    const order = normalizeTrackerColumnOrder(profile?.trackerColumnOrder);
    const statusTabs = order
      .map((id) => FILTERS.find((f) => f.id === id))
      .filter((f): f is (typeof FILTERS)[number] => Boolean(f));
    return [FILTERS[0], ...statusTabs];
  }, [profile?.trackerColumnOrder]);

  const orderedKanbanColumns = useMemo(() => {
    const order = normalizeTrackerColumnOrder(profile?.trackerColumnOrder);
    return order.map((id) => KANBAN_COLUMNS.find((c) => c.id === id)).filter(Boolean) as typeof KANBAN_COLUMNS;
  }, [profile?.trackerColumnOrder]);

  const filteredByStatus = filter === 'all' ? jobs : jobs.filter((j) => j.status === filter);
  const filtered =
    jobSearch.trim() === ''
      ? filteredByStatus
      : filteredByStatus.filter((j) => jobMatchesTrackerSearch(j, jobSearch));
  const counts: Record<string, number> = { all: jobs.length };
  for (const j of jobs) counts[j.status] = (counts[j.status] ?? 0) + 1;

  async function moveStatus(job: Job, newStatus: JobStatus) {
    setStatusPickerJob(null);
    const updated: Job = { ...job, status: newStatus, updatedAt: now() };
    await db.updateJob(updated);
    if (newStatus === 'recruiter_screen') await awardPoints('status_recruiter_screen', job.id);
    else if (newStatus === 'interviewing')   await awardPoints('status_interviewing',   job.id);
    else if (newStatus === 'offer')          await awardPoints('status_offer',          job.id);
    else if (newStatus === 'rejected')       await awardPoints('status_rejected',       job.id);
    await load();
  }

  return (
    <div className="min-h-full bg-stone-50">
      {/* Header */}
      <div className="bg-white px-5 pt-8 pb-4 border-b border-stone-100">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-extrabold tracking-tight text-stone-900">Jobs</h1>
          <button
            onClick={() => openAddJob()}
            className="flex items-center gap-1.5 bg-gradient-to-r from-blue-500 to-violet-600 text-white px-3.5 py-2 rounded-xl text-sm font-semibold active:scale-95 transition-transform"
          >
            <Plus size={15} /> Add
          </button>
        </div>

        <div className="flex w-full items-center gap-2 mb-3">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-stone-200 bg-stone-50/70 px-3 py-2.5 focus-within:border-violet-300 focus-within:ring-2 focus-within:ring-violet-200/80">
            <Search size={16} className="text-stone-400 shrink-0" strokeWidth={2} aria-hidden />
            <input
              type="search"
              value={jobSearch}
              onChange={(e) => setJobSearch(e.target.value)}
              placeholder={'Search company\u2026'}
              className="min-w-0 flex-1 border-0 bg-transparent text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-0"
              aria-label="Search jobs by company or role"
            />
          </div>
          {jobSearch.trim() !== '' && (
            <button
              type="button"
              onClick={() => setJobSearch('')}
              className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-stone-200 bg-white px-2.5 py-2 text-[11px] font-semibold text-stone-600 shadow-sm active:scale-95"
            >
              <X size={13} strokeWidth={2} />
              Clear
            </button>
          )}
        </div>

        {/* Status filter tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
          {filterTabs.map(({ id, short }) => {
            const count = counts[id] ?? 0;
            const active = filter === id;
            return (
              <button
                key={id}
                onClick={() => setFilter(id)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                  active
                    ? 'bg-violet-600 text-white'
                    : 'bg-stone-100 text-stone-500'
                }`}
              >
                {short}
                {count > 0 && (
                  <span className={`text-[10px] font-bold tabular-nums ${active ? 'text-violet-200' : 'text-stone-400'}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Job list */}
      <div className="px-4 py-3 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={20} className="animate-spin text-violet-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-stone-400 text-sm">
              {jobSearch.trim() !== '' && jobs.length > 0 && filteredByStatus.length > 0
                ? 'No matching companies found.'
                : filter === 'all'
                  ? 'No jobs yet.'
                  : `No ${STATUS_LABELS[filter as JobStatus]} jobs.`}
            </p>
            {filter === 'all' && jobs.length === 0 && jobSearch.trim() === '' && (
              <button
                onClick={() => openAddJob()}
                className="mt-3 text-sm font-semibold text-violet-600"
              >
                Add your first application →
              </button>
            )}
          </div>
        ) : (
          filtered.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onEdit={() => setEditJob(job)}
              onMoveStatus={() => setStatusPickerJob(job)}
              onRefresh={load}
            />
          ))
        )}
        <div className="h-4" />
      </div>

      {/* Status picker bottom sheet */}
      {statusPickerJob && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setStatusPickerJob(null)}>
          <div
            className="w-full bg-white rounded-t-2xl shadow-2xl pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-stone-100">
              <p className="text-sm font-bold text-stone-800">Move to…</p>
              <button onClick={() => setStatusPickerJob(null)}>
                <X size={18} className="text-stone-400" />
              </button>
            </div>
            <div className="px-3 pt-2">
              {orderedKanbanColumns.map((col) => {
                const isCurrent = col.id === statusPickerJob.status;
                return (
                  <button
                    key={col.id}
                    onClick={() => moveStatus(statusPickerJob, col.id)}
                    disabled={isCurrent}
                    className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-sm font-medium text-stone-700 hover:bg-stone-50 active:bg-stone-100 disabled:opacity-40 transition-colors"
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[col.id]}`} />
                    {col.label}
                    {isCurrent && <span className="ml-auto text-xs text-stone-400">Current</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {editJob && (
        <JobFormModal
          open
          job={editJob}
          onClose={() => { setEditJob(null); load(); }}
        />
      )}
    </div>
  );
}

// ── Job Card ─────────────────────────────────────────────────────────────────

interface CardProps {
  job: Job;
  onEdit: () => void;
  onMoveStatus: () => void;
  onRefresh: () => Promise<void>;
}

function JobCard({ job, onEdit, onMoveStatus, onRefresh }: CardProps) {
  const [notesOpen, setNotesOpen] = useState(false);
  const [draft, setDraft] = useState(job.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function openNotes() {
    setDraft(job.notes ?? '');
    setNotesOpen(true);
    setTimeout(() => textareaRef.current?.focus(), 50);
  }

  async function saveNotes() {
    setSaving(true);
    await db.updateJob({ ...job, notes: draft.trim(), updatedAt: now() });
    if (draft.trim()) await awardPoints('notes_added', job.id);
    await onRefresh();
    setSaving(false);
    setSaved(true);
    setTimeout(() => { setSaved(false); setNotesOpen(false); }, 800);
  }

  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
      {/* Status accent stripe */}
      <div className={`h-0.5 w-full ${STATUS_DOT[job.status].replace('bg-', 'bg-').replace('-4', '-3')}`} />

      <div className="px-4 pt-3.5 pb-3">
        {/* Job info */}
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div className="min-w-0">
            <p className="font-bold text-stone-900 text-sm leading-tight truncate">{job.company}</p>
            <p className="text-xs text-stone-400 mt-0.5 truncate">{job.role}</p>
          </div>
          <button
            onClick={onMoveStatus}
            className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border shrink-0 ${STATUS_COLORS[job.status]} active:scale-95 transition-transform`}
          >
            {STATUS_LABELS[job.status]}
            <ChevronDown size={10} />
          </button>
        </div>

        {job.dateApplied && (
          <p className="text-[11px] text-stone-300 mb-3">Applied {formatDate(job.dateApplied)}</p>
        )}

        {/* Notes section */}
        {notesOpen && (
          <div className="mb-3">
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              placeholder="Notes after your interview, follow-up details…"
              className="w-full border border-violet-200 rounded-xl px-3 py-2 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none bg-violet-50/30"
            />
            <div className="flex justify-end gap-2 mt-1.5">
              <button
                onClick={() => setNotesOpen(false)}
                className="text-xs text-stone-400 px-3 py-1.5 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={saveNotes}
                disabled={saving}
                className="flex items-center gap-1 text-xs font-semibold bg-violet-600 text-white px-3 py-1.5 rounded-lg disabled:opacity-50"
              >
                {saved ? <><Check size={11} /> Saved</> : saving ? <Loader2 size={11} className="animate-spin" /> : 'Save'}
              </button>
            </div>
          </div>
        )}

        {/* Quick actions */}
        <div className="flex gap-1.5 pt-2.5 border-t border-stone-50">
          <button
            onClick={onMoveStatus}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-stone-50 text-stone-500 text-[11px] font-medium hover:bg-stone-100 active:scale-95 transition-all"
          >
            <ChevronDown size={11} />
            Status
          </button>

          <Link
            href={`/prep/${job.id}`}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-violet-50 text-violet-600 text-[11px] font-medium hover:bg-violet-100 active:scale-95 transition-all"
          >
            <FileText size={11} />
            Prep
          </Link>

          <button
            onClick={openNotes}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium active:scale-95 transition-all ${
              job.notes
                ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                : 'bg-stone-50 text-stone-500 hover:bg-stone-100'
            }`}
          >
            <StickyNote size={11} />
            Notes
          </button>

          <button
            onClick={onEdit}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-stone-50 text-stone-500 text-[11px] font-medium hover:bg-stone-100 active:scale-95 transition-all ml-auto"
          >
            <Pencil size={11} />
            Edit
          </button>
        </div>
      </div>
    </div>
  );
}
