'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MapPin, DollarSign, Calendar, Pencil } from 'lucide-react';
import { Job, STATUS_BORDER } from '@/lib/types';
import { applicationAgeDays } from '@/lib/autoGhost';

interface Props {
  job: Job;
  onSelect: (job: Job) => void;
  isDragging?: boolean;
}

/** Frosted surface + whisper tint by status (premium lane cohesion) */
const STATUS_CARD_SURFACE: Record<string, string> = {
  applied:
    'bg-gradient-to-br from-white/95 via-white/90 to-blue-50/25 ring-1 ring-slate-200/35',
  recruiter_screen:
    'bg-gradient-to-br from-white/95 via-white/90 to-sky-50/30 ring-1 ring-slate-200/35',
  interviewing:
    'bg-gradient-to-br from-white/95 via-white/90 to-violet-50/35 ring-1 ring-slate-200/35',
  offer:
    'bg-gradient-to-br from-white/95 via-emerald-50/25 to-teal-50/20 ring-1 ring-emerald-200/30',
  rejected:
    'bg-gradient-to-br from-white/92 via-red-50/20 to-stone-50/40 ring-1 ring-red-100/40',
  ghosted:
    'bg-gradient-to-br from-stone-50/95 via-white/80 to-stone-100/50 ring-1 ring-stone-200/45',
};

function appliedLabel(dateStr: string): string {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
  if (days === 0) return 'Applied today';
  if (days === 1) return 'Applied yesterday';
  return `Applied ${days}d ago`;
}

function interviewLabel(dateStr: string): string | null {
  const days = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return null;
  if (days === 0) return 'Interview today';
  if (days === 1) return 'Interview tomorrow';
  return `Interview in ${days}d`;
}

export default function JobCard({ job, onSelect, isDragging }: Props) {
  const {
    attributes, listeners, setNodeRef, transform, transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: job.id });

  const style = { transform: CSS.Transform.toString(transform), transition };

  const upcoming = job.interviewDates?.find((d) => new Date(d) >= new Date());
  const intLabel = upcoming ? interviewLabel(upcoming) : null;
  const appliedStr = job.dateApplied ? appliedLabel(job.dateApplied) : null;
  const surface = STATUS_CARD_SURFACE[job.status] ?? STATUS_CARD_SURFACE.applied;
  const isGhosted = job.status === 'ghosted';
  const isSettled = job.status === 'rejected' || isGhosted;
  const ghostedAge = isGhosted ? applicationAgeDays(job) : 0;
  const dragging = Boolean(isDragging || isSortableDragging);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onSelect(job)}
      className={`
        job-card group relative cursor-pointer select-none rounded-2xl border border-slate-200/55 p-3.5
        ring-1 ring-inset ring-white/75
        border-l-4 ${STATUS_BORDER[job.status]}
        ${surface}
        ${isGhosted ? 'saturate-[0.92]' : ''}
        ${dragging
          ? 'z-20 scale-[0.98] opacity-75 shadow-[0_20px_40px_-12px_rgba(67,56,202,0.25)] ring-2 ring-indigo-300/35'
          : 'shadow-[0_4px_22px_-8px_rgba(15,23,42,0.1),0_0_0_1px_rgba(255,255,255,0.65)_inset] hover:-translate-y-1 hover:shadow-[0_12px_36px_-10px_rgba(99,102,241,0.18),0_0_28px_rgba(245,185,66,0.06)] hover:border-slate-200/80'
        }
        transition-[transform,box-shadow,opacity,border-color] duration-200 ease-out
      `}
    >
      <div className="absolute right-2.5 top-2.5 z-10 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onSelect(job); }}
          onPointerDown={(e) => e.stopPropagation()}
          className="rounded-lg border border-slate-200/80 bg-white/95 p-1.5 text-slate-400 shadow-sm transition hover:border-indigo-200/90 hover:bg-indigo-50/90 hover:text-indigo-600"
          title="Edit"
        >
          <Pencil size={11} strokeWidth={2.25} />
        </button>
      </div>

      <div
        className={`truncate pr-7 text-[0.8125rem] font-semibold leading-snug tracking-tight ${isSettled ? 'text-slate-600' : 'text-slate-900'}`}
      >
        {job.company}
      </div>

      <div className={`mt-0.5 truncate text-[11px] leading-snug ${isSettled ? 'text-slate-400' : 'text-slate-500'}`}>
        {job.role}
      </div>

      {(job.location || job.salary || intLabel || appliedStr) && (
        <div className="mt-3 space-y-1.5 border-t border-slate-200/50 pt-2.5">
          {intLabel && (
            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-indigo-600">
              <Calendar size={11} strokeWidth={2.25} className="shrink-0 opacity-90" />
              <span>{intLabel}</span>
            </div>
          )}
          {job.location && (
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <MapPin size={11} strokeWidth={2} className="shrink-0 text-slate-400" />
              <span className="truncate">{job.location}</span>
            </div>
          )}
          {job.salary && (
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <DollarSign size={11} strokeWidth={2} className="shrink-0 text-slate-400" />
              <span className="truncate">{job.salary}</span>
            </div>
          )}
          {appliedStr && !intLabel && (
            <div className="text-[10px] tabular-nums text-slate-400">{appliedStr}</div>
          )}
          {isGhosted && ghostedAge > 0 && (
            <div className="text-[9px] tabular-nums text-slate-400">
              No response · {ghostedAge}d
            </div>
          )}
        </div>
      )}
    </div>
  );
}
