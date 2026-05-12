'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core';
import { GripVertical, Plus } from 'lucide-react';
import { Job, JobStatus } from '@/lib/types';
import JobCard from './JobCard';

export type ColumnDragHandleProps = {
  attributes: DraggableAttributes;
  listeners: DraggableSyntheticListeners;
  isDragging: boolean;
};

/** Per-lane orb gradient + outer glow (inline shadow for premium control) */
const LANE_ORB: Record<
  JobStatus,
  { gradient: string; shadow: string }
> = {
  applied: {
    gradient: 'from-blue-500 to-blue-600',
    shadow:
      '0 0 0 1px rgba(255,255,255,0.35) inset, 0 1px 2px rgba(15,23,42,0.08), 0 0 12px rgba(59,130,246,0.28), 0 0 24px rgba(59,130,246,0.12)',
  },
  recruiter_screen: {
    gradient: 'from-sky-400 to-cyan-500',
    shadow:
      '0 0 0 1px rgba(255,255,255,0.35) inset, 0 1px 2px rgba(15,23,42,0.08), 0 0 12px rgba(14,165,233,0.26), 0 0 22px rgba(6,182,212,0.1)',
  },
  interviewing: {
    gradient: 'from-indigo-500 to-violet-600',
    shadow:
      '0 0 0 1px rgba(255,255,255,0.32) inset, 0 1px 2px rgba(15,23,42,0.08), 0 0 12px rgba(99,102,241,0.26), 0 0 22px rgba(139,92,246,0.1)',
  },
  offer: {
    gradient: 'from-emerald-500 to-teal-600',
    shadow:
      '0 0 0 1px rgba(255,255,255,0.35) inset, 0 1px 2px rgba(15,23,42,0.08), 0 0 12px rgba(16,185,129,0.26), 0 0 22px rgba(20,184,166,0.1)',
  },
  rejected: {
    gradient: 'from-red-500 to-rose-600',
    shadow:
      '0 0 0 1px rgba(255,255,255,0.28) inset, 0 1px 2px rgba(15,23,42,0.08), 0 0 12px rgba(239,68,68,0.22), 0 0 20px rgba(244,63,94,0.08)',
  },
  ghosted: {
    gradient: 'from-slate-400 to-slate-500',
    shadow:
      '0 0 0 1px rgba(255,255,255,0.25) inset, 0 1px 2px rgba(15,23,42,0.06), 0 0 10px rgba(100,116,139,0.18)',
  },
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

/** Glass count pill — border + text tuned per lane */
const LANE_BADGE: Record<JobStatus, string> = {
  applied:
    'border-blue-200/70 bg-blue-50/50 text-blue-800 shadow-[0_0_16px_-4px_rgba(59,130,246,0.2)]',
  recruiter_screen:
    'border-sky-200/70 bg-sky-50/50 text-sky-900 shadow-[0_0_16px_-4px_rgba(14,165,233,0.18)]',
  interviewing:
    'border-indigo-200/70 bg-indigo-50/45 text-indigo-900 shadow-[0_0_16px_-4px_rgba(99,102,241,0.18)]',
  offer:
    'border-emerald-200/70 bg-emerald-50/50 text-emerald-900 shadow-[0_0_16px_-4px_rgba(16,185,129,0.18)]',
  rejected:
    'border-red-200/70 bg-red-50/50 text-red-800 shadow-[0_0_16px_-4px_rgba(239,68,68,0.15)]',
  ghosted:
    'border-slate-200/80 bg-slate-100/60 text-slate-600 shadow-[0_1px_8px_-2px_rgba(15,23,42,0.08)]',
};

interface Props {
  column: { id: JobStatus; label: string };
  jobs: Job[];
  onAddJob: () => void;
  onSelectJob: (job: Job) => void;
  /** Header drag handle for column reorder (desktop Kanban only). */
  columnDrag?: ColumnDragHandleProps;
}

export default function KanbanColumn({ column, jobs, onAddJob, onSelectJob, columnDrag }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  const orb = LANE_ORB[column.id] ?? LANE_ORB.ghosted;
  const overCls = COL_OVER[column.id] ?? 'bg-violet-50 ring-1 ring-violet-200';
  const bgCls = COL_BG[column.id] ?? 'bg-stone-100/60';
  const badgeCls = LANE_BADGE[column.id] ?? LANE_BADGE.ghosted;
  const emptyCopy = COL_EMPTY[column.id] ?? 'Drop here';

  return (
    <div className="flex min-w-0 w-full shrink-0 flex-col">
      {/* ── Lane header (premium Kanban) ── */}
      <div
        className={`
          group/header mb-3 rounded-2xl border border-slate-200/80 bg-white/85 px-3 py-2.5
          shadow-sm shadow-slate-900/[0.04] ring-1 ring-slate-200/40 backdrop-blur-md
          transition-all duration-300 ease-out
          hover:border-slate-200 hover:bg-white/95 hover:shadow-md hover:shadow-slate-900/[0.06]
          ${columnDrag?.isDragging ? 'border-indigo-300/70 ring-indigo-300/35 bg-indigo-50/30' : ''}
        `}
      >
        <div className="flex items-center gap-2.5">
          {columnDrag && (
            <button
              type="button"
              className="
                hidden md:inline-flex shrink-0 h-8 w-7 items-center justify-center rounded-lg
                border border-transparent text-slate-400 cursor-grab touch-none
                hover:border-slate-200/90 hover:bg-slate-50 hover:text-slate-600
                active:cursor-grabbing
              "
              aria-label={`Reorder ${column.label} column`}
              {...columnDrag.attributes}
              {...columnDrag.listeners}
              onClick={(e) => e.preventDefault()}
            >
              <GripVertical size={16} strokeWidth={2} className="pointer-events-none" />
            </button>
          )}
          {/* Status orb */}
          <div className="relative shrink-0">
            <div
              className={`kanban-column-orb h-3 w-3 rounded-full bg-gradient-to-br ${orb.gradient} ring-2 ring-white/90`}
              style={{ boxShadow: orb.shadow }}
              aria-hidden
            />
          </div>

          <div className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-bold tracking-tight text-slate-800">
              {column.label}
            </span>
          </div>

          {jobs.length > 0 && (
            <span
              className={`
                inline-flex min-h-[1.375rem] min-w-[1.375rem] shrink-0 items-center justify-center
                rounded-full border px-2 py-0.5 text-[11px] font-bold tabular-nums backdrop-blur-sm
                transition-all duration-300 ease-out
                group-hover/header:scale-105
                ${badgeCls}
              `}
            >
              {jobs.length}
            </span>
          )}

          <button
            type="button"
            onClick={onAddJob}
            className="
              flex h-8 w-8 shrink-0 items-center justify-center rounded-full
              border border-slate-200/90 bg-white/90 text-slate-500 shadow-sm
              transition-all duration-200 ease-out
              hover:-translate-y-0.5 hover:border-indigo-300/70 hover:bg-white hover:text-indigo-700
              hover:shadow-md hover:shadow-indigo-500/[0.12]
              active:translate-y-0 active:scale-95
            "
            title={`Add job to ${column.label}`}
          >
            <Plus size={15} strokeWidth={2.25} className="transition-transform duration-200 group-hover/header:rotate-90" />
          </button>
        </div>
      </div>

      {/* ── Drop zone ── */}
      <div
        ref={setNodeRef}
        className={`
          flex min-h-36 flex-1 flex-col gap-2 rounded-2xl p-2
          transition-all duration-150
          ${isOver ? overCls : bgCls}
        `}
      >
        <SortableContext items={jobs.map((j) => j.id)} strategy={verticalListSortingStrategy}>
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} onSelect={onSelectJob} />
          ))}
        </SortableContext>

        {jobs.length === 0 && (
          <div className="flex flex-1 items-center justify-center px-4 py-6">
            <p className="text-center text-[11px] leading-snug text-stone-400">
              {emptyCopy}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
