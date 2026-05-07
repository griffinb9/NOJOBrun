'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MapPin, DollarSign, Calendar } from 'lucide-react';
import { Job, STATUS_BORDER } from '@/lib/types';

interface Props {
  job: Job;
  onSelect: (job: Job) => void;
  isDragging?: boolean;
}

export default function JobCard({ job, onSelect, isDragging }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortableDragging } =
    useSortable({ id: job.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const upcoming = job.interviewDates?.find((d) => new Date(d) >= new Date());

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onSelect(job)}
      className={`bg-white rounded-xl border-l-4 ${STATUS_BORDER[job.status]} shadow-sm p-3.5 cursor-pointer hover:shadow-md transition-shadow select-none ${
        isDragging || isSortableDragging ? 'opacity-50' : ''
      }`}
    >
      <div className="font-semibold text-sm text-stone-800 truncate">{job.company}</div>
      <div className="text-xs text-stone-500 truncate mt-0.5">{job.role}</div>

      <div className="mt-2.5 flex flex-col gap-1">
        {job.location && (
          <div className="flex items-center gap-1 text-xs text-stone-400">
            <MapPin size={11} />
            <span className="truncate">{job.location}</span>
          </div>
        )}
        {job.salary && (
          <div className="flex items-center gap-1 text-xs text-stone-400">
            <DollarSign size={11} />
            <span className="truncate">{job.salary}</span>
          </div>
        )}
        {upcoming && (
          <div className="flex items-center gap-1 text-xs text-violet-600 font-medium">
            <Calendar size={11} />
            <span>Interview: {upcoming}</span>
          </div>
        )}
      </div>
    </div>
  );
}
