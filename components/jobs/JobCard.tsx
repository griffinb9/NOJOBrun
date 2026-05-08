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

// Subtle background tints for status-differentiated cards
const STATUS_CARD_BG: Record<string, string> = {
  applied:          'bg-white',
  recruiter_screen: 'bg-white',
  interviewing:     'bg-white',
  offer:            'bg-emerald-50/30',
  rejected:         'bg-red-50/40',
  ghosted:          'bg-stone-50',
};

function appliedLabel(dateStr: string): string {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
  if (days === 0) return 'Applied today';
  if (days === 1) return 'Applied yesterday';
  return `Applied ${days}d ago`;
}

function interviewLabel(dateStr: string): string | null {
  const days = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
  if (days < 0)  return null;
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

  const upcoming     = job.interviewDates?.find((d) => new Date(d) >= new Date());
  const intLabel     = upcoming ? interviewLabel(upcoming) : null;
  const appliedStr   = job.dateApplied ? appliedLabel(job.dateApplied) : null;
  const cardBg       = STATUS_CARD_BG[job.status] ?? 'bg-white';
  const isGhosted    = job.status === 'ghosted';
  const isSettled    = job.status === 'rejected' || isGhosted;
  const ghostedAge   = isGhosted ? applicationAgeDays(job) : 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onSelect(job)}
      className={`
        group relative ${cardBg} rounded-2xl border-l-4 ${STATUS_BORDER[job.status]}
        p-3.5 cursor-pointer select-none
        ${isGhosted ? 'saturate-75' : ''}
        ${isDragging || isSortableDragging
          ? 'opacity-50 shadow-xl'
          : 'hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(0,0,0,0.10)]'
        }
        shadow-[0_1px_4px_rgba(0,0,0,0.07),0_0_0_1px_rgba(0,0,0,0.04)]
        transition-all duration-150
      `}
    >
      {/* Hover quick-action — pencil icon top-right */}
      <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-10">
        <button
          onClick={(e) => { e.stopPropagation(); onSelect(job); }}
          onPointerDown={(e) => e.stopPropagation()} // prevent accidental drag start
          className="p-1 rounded-lg bg-white text-stone-300 hover:text-violet-600 hover:bg-violet-50 shadow-sm border border-stone-100 transition-colors"
          title="Edit"
        >
          <Pencil size={10} strokeWidth={2} />
        </button>
      </div>

      {/* Company — most prominent */}
      <div className={`font-bold text-[13px] leading-snug truncate pr-6 ${isSettled ? 'text-stone-600' : 'text-stone-900'}`}>
        {job.company}
      </div>

      {/* Role — secondary */}
      <div className={`text-[11px] truncate mt-0.5 ${isSettled ? 'text-stone-400' : 'text-stone-500'}`}>
        {job.role}
      </div>

      {/* Metadata row */}
      {(job.location || job.salary || intLabel || appliedStr) && (
        <div className="mt-2.5 flex flex-col gap-1">
          {intLabel && (
            <div className="flex items-center gap-1 text-[10px] font-semibold text-violet-600">
              <Calendar size={10} strokeWidth={2.5} />
              <span>{intLabel}</span>
            </div>
          )}
          {job.location && (
            <div className="flex items-center gap-1 text-[10px] text-stone-400">
              <MapPin size={10} strokeWidth={2} />
              <span className="truncate">{job.location}</span>
            </div>
          )}
          {job.salary && (
            <div className="flex items-center gap-1 text-[10px] text-stone-400">
              <DollarSign size={10} strokeWidth={2} />
              <span className="truncate">{job.salary}</span>
            </div>
          )}
          {appliedStr && !intLabel && (
            <div className="text-[10px] text-stone-300 mt-0.5">{appliedStr}</div>
          )}
          {isGhosted && ghostedAge > 0 && (
            <div className="text-[9px] text-stone-300 mt-0.5 tabular-nums">
              No response · {ghostedAge}d
            </div>
          )}
        </div>
      )}
    </div>
  );
}
