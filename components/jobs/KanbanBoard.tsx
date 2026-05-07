'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { Plus } from 'lucide-react';
import { Job, JobStatus, KANBAN_COLUMNS } from '@/lib/types';
import { storage } from '@/lib/storage';
import { now } from '@/lib/utils';
import { awardPoints } from '@/lib/points';
import KanbanColumn from './KanbanColumn';
import JobCard from './JobCard';
import JobFormModal from './JobFormModal';
import JobDetailModal from './JobDetailModal';

export default function KanbanBoard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addStatus, setAddStatus] = useState<JobStatus>('applied');
  const [detailJob, setDetailJob] = useState<Job | null>(null);

  const load = useCallback(() => setJobs(storage.getJobs()), []);

  useEffect(() => { load(); }, [load]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragStart(e: DragStartEvent) {
    const job = jobs.find((j) => j.id === e.active.id);
    setActiveJob(job ?? null);
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveJob(null);
    const { active, over } = e;
    if (!over) return;
    const overId = over.id as string;
    const columnIds = KANBAN_COLUMNS.map((c) => c.id as string);
    const newStatus: JobStatus = columnIds.includes(overId)
      ? (overId as JobStatus)
      : (jobs.find((j) => j.id === overId)?.status ?? 'applied');

    const job = jobs.find((j) => j.id === active.id);
    if (!job || job.status === newStatus) return;

    // Award points for status changes via drag
    if (newStatus === 'recruiter_screen') awardPoints('status_recruiter_screen', job.id, `Recruiter screen earned for ${job.company}`);
    else if (newStatus === 'interviewing') awardPoints('status_interviewing', job.id);
    else if (newStatus === 'offer') awardPoints('status_offer', job.id);
    else if (newStatus === 'rejected') awardPoints('status_rejected', job.id);

    const updated = { ...job, status: newStatus, updatedAt: now() };
    storage.updateJob(updated);
    load();
  }

  function openAdd(status: JobStatus) {
    setAddStatus(status);
    setAddOpen(true);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-stone-100 bg-white">
        <div>
          <h1 className="text-xl font-bold text-stone-800">Job Tracker</h1>
          <p className="text-stone-400 text-xs mt-0.5">{jobs.length} application{jobs.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => openAdd('applied')}
          className="flex items-center gap-2 bg-violet-600 text-white px-3 py-2 rounded-xl text-sm font-medium hover:bg-violet-700"
        >
          <Plus size={15} />
          Add Job
        </button>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto">
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 p-6 min-w-max h-full">
            {KANBAN_COLUMNS.map((col) => (
              <KanbanColumn
                key={col.id}
                column={col}
                jobs={jobs.filter((j) => j.status === col.id)}
                onAddJob={() => openAdd(col.id)}
                onSelectJob={setDetailJob}
              />
            ))}
          </div>
          <DragOverlay>
            {activeJob && <JobCard job={activeJob} onSelect={() => {}} isDragging />}
          </DragOverlay>
        </DndContext>
      </div>

      <JobFormModal
        open={addOpen}
        onClose={() => { setAddOpen(false); load(); }}
        initialStatus={addStatus}
      />

      {detailJob && (
        <JobDetailModal
          job={detailJob}
          onClose={() => { setDetailJob(null); load(); }}
          onEdit={(j) => { setDetailJob(null); setTimeout(() => setDetailJob(j), 50); load(); }}
        />
      )}
    </div>
  );
}
