'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { Job, JobStatus } from '@/lib/types';
import JobCard from './JobCard';

const COL_HEADER_COLORS: Record<string, string> = {
  applied: 'bg-blue-500',
  recruiter_screen: 'bg-sky-400',
  interviewing: 'bg-violet-500',
  offer: 'bg-green-500',
  rejected: 'bg-red-400',
  ghosted: 'bg-stone-300',
};

interface Props {
  column: { id: JobStatus; label: string };
  jobs: Job[];
  onAddJob: () => void;
  onSelectJob: (job: Job) => void;
}

export default function KanbanColumn({ column, jobs, onAddJob, onSelectJob }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div className="flex flex-col w-64 shrink-0">
      {/* Column header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${COL_HEADER_COLORS[column.id]}`} />
          <span className="text-sm font-semibold text-stone-700">{column.label}</span>
          <span className="text-xs text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded-full">
            {jobs.length}
          </span>
        </div>
        <button
          onClick={onAddJob}
          className="text-stone-400 hover:text-violet-600 transition-colors"
          title="Add job"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Cards */}
      <div
        ref={setNodeRef}
        className={`flex-1 flex flex-col gap-2 min-h-32 rounded-xl transition-colors ${
          isOver ? 'bg-violet-50' : 'bg-stone-100/60'
        } p-2`}
      >
        <SortableContext items={jobs.map((j) => j.id)} strategy={verticalListSortingStrategy}>
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} onSelect={onSelectJob} />
          ))}
        </SortableContext>

        {jobs.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-stone-400">Drop here</p>
          </div>
        )}
      </div>
    </div>
  );
}
