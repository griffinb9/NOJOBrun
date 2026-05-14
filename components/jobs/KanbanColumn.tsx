'use client';

import { useCallback, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core';
import { GripVertical, Plus, Sparkles } from 'lucide-react';
import { Job, JobStatus } from '@/lib/types';
import JobCard from './JobCard';

export type ColumnDragHandleProps = {
  attributes: DraggableAttributes;
  listeners: DraggableSyntheticListeners;
  isDragging: boolean;
};

/** Status orb — restrained glow (Linear-style, not neon) */
const LANE_ORB: Record<
  JobStatus,
  { gradient: string; shadow: string }
> = {
  applied: {
    gradient: 'from-blue-500 to-indigo-600',
    shadow: '0 0 0 1px rgba(255,255,255,0.45) inset, 0 1px 2px rgba(15,23,42,0.06), 0 0 10px rgba(59,130,246,0.18)',
  },
  recruiter_screen: {
    gradient: 'from-sky-400 to-cyan-500',
    shadow: '0 0 0 1px rgba(255,255,255,0.45) inset, 0 1px 2px rgba(15,23,42,0.06), 0 0 10px rgba(14,165,233,0.16)',
  },
  interviewing: {
    gradient: 'from-indigo-500 to-violet-600',
    shadow: '0 0 0 1px rgba(255,255,255,0.42) inset, 0 1px 2px rgba(15,23,42,0.06), 0 0 10px rgba(99,102,241,0.16)',
  },
  offer: {
    gradient: 'from-emerald-500 to-teal-600',
    shadow: '0 0 0 1px rgba(255,255,255,0.45) inset, 0 1px 2px rgba(15,23,42,0.06), 0 0 10px rgba(16,185,129,0.14)',
  },
  rejected: {
    gradient: 'from-rose-500 to-red-600',
    shadow: '0 0 0 1px rgba(255,255,255,0.35) inset, 0 1px 2px rgba(15,23,42,0.06), 0 0 8px rgba(244,63,94,0.12)',
  },
  ghosted: {
    gradient: 'from-slate-400 to-slate-500',
    shadow: '0 0 0 1px rgba(255,255,255,0.3) inset, 0 1px 2px rgba(15,23,42,0.05)',
  },
};

/**
 * Lane highlight map. Idle hover is driven by pointerenter/leave on the full column wrapper
 * so header, empty space, and cards all count (CSS `group-hover` / parent `:hover` is unreliable
 * when the pointer is only over descendants in some browsers). Drag-over uses `isOver` only.
 */
const LANE_INTERACTION: Record<
  JobStatus,
  {
    laneBase: string;
    laneHot: string;
    headerHot: string;
    zoneHot: string;
    zoneOver: string;
  }
> = {
  applied: {
    laneBase: 'rounded-[1.4rem] transition-[background-color,box-shadow] duration-200',
    laneHot: 'bg-blue-500/[0.08]',
    headerHot: 'border-blue-200/55 bg-blue-50/25',
    zoneHot:
      'ring-1 ring-blue-300/40 shadow-[0_0_28px_-10px_rgba(59,130,246,0.14)]',
    zoneOver:
      'bg-blue-50/95 ring-2 ring-blue-400/45 shadow-[0_0_0_1px_rgba(255,255,255,0.65)_inset,0_0_32px_-8px_rgba(59,130,246,0.22)]',
  },
  recruiter_screen: {
    laneBase: 'rounded-[1.4rem] transition-[background-color,box-shadow] duration-200',
    laneHot: 'bg-cyan-500/[0.08]',
    headerHot: 'border-sky-200/55 bg-sky-50/22',
    zoneHot:
      'ring-1 ring-cyan-300/40 shadow-[0_0_28px_-10px_rgba(6,182,212,0.14)]',
    zoneOver:
      'bg-sky-50/95 ring-2 ring-sky-400/45 shadow-[0_0_0_1px_rgba(255,255,255,0.65)_inset,0_0_32px_-8px_rgba(14,165,233,0.2)]',
  },
  interviewing: {
    laneBase: 'rounded-[1.4rem] transition-[background-color,box-shadow] duration-200',
    laneHot: 'bg-violet-500/[0.08]',
    headerHot: 'border-violet-200/55 bg-violet-50/24',
    zoneHot:
      'ring-1 ring-violet-300/45 shadow-[0_0_28px_-10px_rgba(139,92,246,0.16)]',
    zoneOver:
      'bg-violet-50/95 ring-2 ring-violet-400/45 shadow-[0_0_0_1px_rgba(255,255,255,0.65)_inset,0_0_32px_-8px_rgba(99,102,241,0.22)]',
  },
  offer: {
    laneBase: 'rounded-[1.4rem] transition-[background-color,box-shadow] duration-200',
    laneHot: 'bg-emerald-500/[0.08]',
    headerHot: 'border-emerald-200/55 bg-emerald-50/22',
    zoneHot:
      'ring-1 ring-emerald-300/45 shadow-[0_0_28px_-10px_rgba(16,185,129,0.15)]',
    zoneOver:
      'bg-emerald-50/95 ring-2 ring-emerald-400/45 shadow-[0_0_0_1px_rgba(255,255,255,0.65)_inset,0_0_32px_-8px_rgba(16,185,129,0.2)]',
  },
  rejected: {
    laneBase: 'rounded-[1.4rem] transition-[background-color,box-shadow] duration-200',
    laneHot: 'bg-rose-500/[0.07]',
    headerHot: 'border-rose-200/55 bg-rose-50/22',
    zoneHot:
      'ring-1 ring-rose-300/40 shadow-[0_0_28px_-10px_rgba(244,63,94,0.12)]',
    zoneOver:
      'bg-rose-50/95 ring-2 ring-rose-400/45 shadow-[0_0_0_1px_rgba(255,255,255,0.6)_inset,0_0_32px_-8px_rgba(244,63,94,0.18)]',
  },
  ghosted: {
    laneBase: 'rounded-[1.4rem] transition-[background-color,box-shadow] duration-200',
    laneHot: 'bg-slate-500/[0.07]',
    headerHot: 'border-slate-300/60 bg-slate-100/52',
    zoneHot:
      'ring-1 ring-slate-300/45 shadow-[0_0_24px_-10px_rgba(100,116,139,0.12)]',
    zoneOver:
      'bg-stone-100/95 ring-2 ring-slate-400/50 shadow-[0_0_0_1px_rgba(255,255,255,0.55)_inset,0_0_28px_-8px_rgba(100,116,139,0.16)]',
  },
};

const COL_BG: Record<string, string> = {
  applied: 'bg-gradient-to-b from-white/55 via-blue-50/15 to-slate-50/25',
  recruiter_screen: 'bg-gradient-to-b from-white/55 via-sky-50/18 to-slate-50/25',
  interviewing: 'bg-gradient-to-b from-white/55 via-violet-50/20 to-slate-50/25',
  offer: 'bg-gradient-to-b from-white/55 via-emerald-50/18 to-slate-50/25',
  rejected: 'bg-gradient-to-b from-white/50 via-red-50/12 to-slate-50/25',
  ghosted: 'bg-gradient-to-b from-stone-50/70 via-white/35 to-stone-100/30',
};

const COL_EMPTY: Record<string, string> = {
  applied: 'Nothing here yet — add an app or drag one in.',
  recruiter_screen: 'Screens you earn show up here. Keep pitching.',
  interviewing: 'Land an interview — this lane will light up.',
  offer: 'Offers stack here. Keep the pipeline warm.',
  rejected: 'Every no gets you closer. Rejections live here.',
  ghosted: 'Ghosted happens. Track it, move on, win next.',
};

const LANE_BADGE: Record<JobStatus, string> = {
  applied:
    'border-blue-200/60 bg-white/90 text-blue-900 shadow-sm shadow-blue-500/8',
  recruiter_screen:
    'border-sky-200/60 bg-white/90 text-sky-950 shadow-sm shadow-sky-500/8',
  interviewing:
    'border-indigo-200/60 bg-white/90 text-indigo-950 shadow-sm shadow-indigo-500/8',
  offer:
    'border-emerald-200/60 bg-white/90 text-emerald-950 shadow-sm shadow-emerald-500/8',
  rejected:
    'border-red-200/60 bg-white/90 text-red-900 shadow-sm shadow-red-500/8',
  ghosted:
    'border-slate-200/70 bg-white/85 text-slate-600 shadow-sm',
};

interface Props {
  column: { id: JobStatus; label: string };
  jobs: Job[];
  onAddJob: () => void;
  onSelectJob: (job: Job) => void;
  columnDrag?: ColumnDragHandleProps;
  emptyWhenFiltered?: string;
}

function isFinePointerHover(e: React.PointerEvent) {
  return e.pointerType === 'mouse' || e.pointerType === 'pen';
}

export default function KanbanColumn({ column, jobs, onAddJob, onSelectJob, columnDrag, emptyWhenFiltered }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const [lanePointerHot, setLanePointerHot] = useState(false);

  const onLanePointerEnter = useCallback((e: React.PointerEvent) => {
    if (isFinePointerHover(e)) setLanePointerHot(true);
  }, []);
  const onLanePointerLeave = useCallback((e: React.PointerEvent) => {
    if (isFinePointerHover(e)) setLanePointerHot(false);
  }, []);

  const orb = LANE_ORB[column.id] ?? LANE_ORB.ghosted;
  const hi = LANE_INTERACTION[column.id] ?? LANE_INTERACTION.ghosted;
  const bgCls = COL_BG[column.id] ?? COL_BG.ghosted;
  const badgeCls = LANE_BADGE[column.id] ?? LANE_BADGE.ghosted;
  const emptyCopy = COL_EMPTY[column.id] ?? 'Drop here';

  const laneHotVisual = lanePointerHot && !isOver;

  return (
    <div
      onPointerEnter={onLanePointerEnter}
      onPointerLeave={onLanePointerLeave}
      className={`
        flex min-w-0 w-full shrink-0 flex-col
        ${hi.laneBase}
        ${laneHotVisual ? hi.laneHot : ''}
      `}
    >
      <div
        className={`
          group/header relative mb-3 overflow-x-clip rounded-2xl border border-white/70 bg-white/75
          px-3 py-2.5 shadow-[0_4px_24px_-12px_rgba(30,27,75,0.08),0_0_0_1px_rgba(255,255,255,0.75)_inset]
          ring-1 ring-slate-200/45 backdrop-blur-md transition-all duration-200 ease-out
          before:pointer-events-none before:absolute before:inset-x-3 before:top-0 before:h-px before:rounded-full
          before:bg-gradient-to-r before:from-transparent before:via-amber-400/30 before:to-transparent
          hover:border-indigo-100/80 hover:bg-white/90 hover:shadow-[0_8px_32px_-12px_rgba(99,102,241,0.12)]
          ${laneHotVisual ? hi.headerHot : ''}
          ${columnDrag?.isDragging ? 'border-indigo-200/80 bg-indigo-50/40 ring-indigo-200/50' : ''}
        `}
      >
        <div className="flex items-center gap-2.5">
          {columnDrag && (
            <button
              type="button"
              className="
                hidden h-8 w-7 shrink-0 cursor-grab items-center justify-center rounded-lg border border-transparent
                text-slate-400 transition-colors hover:border-slate-200/90 hover:bg-slate-50/90 hover:text-slate-600
                active:cursor-grabbing md:inline-flex touch-none
              "
              aria-label={`Reorder ${column.label} column`}
              {...columnDrag.attributes}
              {...columnDrag.listeners}
              onClick={(e) => e.preventDefault()}
            >
              <GripVertical size={16} strokeWidth={2} className="pointer-events-none" />
            </button>
          )}
          <div className="relative shrink-0">
            <div
              className={`kanban-column-orb h-3 w-3 rounded-full bg-gradient-to-br ${orb.gradient} ring-2 ring-white/90`}
              style={{ boxShadow: orb.shadow }}
              aria-hidden
            />
          </div>

          <div className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold tracking-tight text-slate-800">
              {column.label}
            </span>
          </div>

          {jobs.length > 0 && (
            <span
              className={`
                inline-flex min-h-[1.375rem] min-w-[1.375rem] shrink-0 items-center justify-center rounded-full
                border px-2 py-0.5 text-[11px] font-bold tabular-nums transition-transform duration-200
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
              border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/90 text-slate-500 shadow-sm
              transition-all duration-200 ease-out
              hover:-translate-y-0.5 hover:border-indigo-300/70 hover:from-indigo-50 hover:to-violet-50/80 hover:text-indigo-700
              hover:shadow-md hover:shadow-indigo-500/15 active:translate-y-0 active:scale-95
            "
            title={`Add job to ${column.label}`}
          >
            <Plus size={15} strokeWidth={2.25} className="transition-transform duration-200 group-hover/header:rotate-90" />
          </button>
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={`
          flex min-h-[10.5rem] flex-1 flex-col gap-2.5 rounded-[1.25rem] border border-slate-200/40 p-2.5
          shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] transition-all duration-200
          ${isOver ? hi.zoneOver : `${bgCls}${laneHotVisual ? ` ${hi.zoneHot}` : ''}`}
        `}
      >
        <SortableContext items={jobs.map((j) => j.id)} strategy={verticalListSortingStrategy}>
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} onSelect={onSelectJob} />
          ))}
        </SortableContext>

        {jobs.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center px-3 py-6">
            <div className="w-full max-w-[13.5rem] rounded-xl border border-dashed border-slate-300/55 bg-white/35 px-4 py-7 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
              <Sparkles className="mx-auto mb-2 h-7 w-7 text-indigo-300/90" strokeWidth={1.75} aria-hidden />
              <p className="text-[12px] font-medium leading-snug text-slate-600">
                {emptyWhenFiltered ?? emptyCopy}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
