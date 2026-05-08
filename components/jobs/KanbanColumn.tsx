'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { Job, JobStatus } from '@/lib/types';
import JobCard from './JobCard';

// Colored dot per status
const COL_DOT: Record<string, string> = {
  applied:          'bg-blue-500',
  recruiter_screen: 'bg-sky-400',
  interviewing:     'bg-violet-500',
  offer:            'bg-emerald-500',
  rejected:         'bg-red-400',
  ghosted:          'bg-stone-300',
};

// Drag-over highlight — status-tinted ring + bg
const COL_OVER: Record<string, string> = {
  applied:          'bg-blue-50   ring-1 ring-blue-200',
  recruiter_screen: 'bg-sky-50    ring-1 ring-sky-200',
  interviewing:     'bg-violet-50 ring-1 ring-violet-200',
  offer:            'bg-emerald-50 ring-1 ring-emerald-200',
  rejected:         'bg-red-50    ring-1 ring-red-200',
  ghosted:          'bg-stone-100 ring-1 ring-stone-300',
};

// Resting column background — very subtle status tint
const COL_BG: Record<string, string> = {
  applied:          'bg-blue-50/30',
  recruiter_screen: 'bg-sky-50/30',
  interviewing:     'bg-violet-50/30',
  offer:            'bg-emerald-50/30',
  rejected:         'bg-red-50/20',
  ghosted:          'bg-stone-100/50',
};

// Motivating empty-state copy per column
const COL_EMPTY: Record<string, string> = {
  applied:          'No applications yet — drop one in.',
  recruiter_screen: 'Phone screens land here.',
  interviewing:     'Interviews will show up here.',
  offer:            'No offers yet — keep building.',
  rejected:         'Closed doors still count as reps.',
  ghosted:          'No shame, it happens.',
};

// Count badge accent color per status
const COL_COUNT: Record<string, string> = {
  applied:          'bg-blue-100 text-blue-700',
  recruiter_screen: 'bg-sky-100 text-sky-700',
  interviewing:     'bg-violet-100 text-violet-700',
  offer:            'bg-emerald-100 text-emerald-700',
  rejected:         'bg-red-100 text-red-600',
  ghosted:          'bg-stone-100 text-stone-500',
};

interface Props {
  column: { id: JobStatus; label: string };
  jobs: Job[];
  onAddJob: () => void;
  onSelectJob: (job: Job) => void;
}

export default function KanbanColumn({ column, jobs, onAddJob, onSelectJob }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  const dot      = COL_DOT[column.id]   ?? 'bg-stone-300';
  const overCls  = COL_OVER[column.id]  ?? 'bg-violet-50 ring-1 ring-violet-200';
  const bgCls    = COL_BG[column.id]    ?? 'bg-stone-100/60';
  const countCls = COL_COUNT[column.id] ?? 'bg-stone-100 text-stone-500';
  const emptyCopy = COL_EMPTY[column.id] ?? 'Drop here';

  return (
    <div className="flex flex-col w-64 shrink-0">
      {/* ── Column header ── */}
      <div className="flex items-center justify-between mb-3 px-0.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
          <span className="text-[13px] font-semibold text-stone-700 truncate">{column.label}</span>
          {jobs.length > 0 && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full tabular-nums ${countCls}`}>
              {jobs.length}
            </span>
          )}
        </div>
        <button
          onClick={onAddJob}
          className="shrink-0 ml-1 w-6 h-6 flex items-center justify-center rounded-lg text-stone-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"
          title={`Add job to ${column.label}`}
        >
          <Plus size={14} strokeWidth={2.5} />
        </button>
      </div>

      {/* ── Drop zone ── */}
      <div
        ref={setNodeRef}
        className={`
          flex-1 flex flex-col gap-2 min-h-36 rounded-2xl p-2
          transition-all duration-150
          ${isOver ? overCls : bgCls}
        `}
      >
        <SortableContext items={jobs.map((j) => j.id)} strategy={verticalListSortingStrategy}>
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} onSelect={onSelectJob} />
          ))}
        </SortableContext>

        {/* Empty state */}
        {jobs.length === 0 && (
          <div className="flex-1 flex items-center justify-center px-4 py-6">
            <p className="text-[11px] text-stone-400 text-center leading-snug">
              {emptyCopy}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
