'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { Plus, Upload } from 'lucide-react';
import { Job, JobStatus, KANBAN_COLUMNS } from '@/lib/types';
import { storage } from '@/lib/storage';
import { now } from '@/lib/utils';
import { awardPoints } from '@/lib/points';
import KanbanColumn from './KanbanColumn';
import JobCard from './JobCard';
import JobFormModal from './JobFormModal';
import JobDetailModal from './JobDetailModal';
import ImportJobsModal from './ImportJobsModal';

/**
 * Ensures every job has a clean 0-based sortOrder within its status group.
 * Jobs that already have sortOrder keep their relative position.
 * Jobs without sortOrder fall back to createdAt ordering.
 */
function ensureSortOrders(rawJobs: Job[]): { jobs: Job[]; changed: boolean } {
  const byStatus = new Map<string, Job[]>();
  for (const j of rawJobs) {
    const g = byStatus.get(j.status) ?? [];
    g.push(j);
    byStatus.set(j.status, g);
  }

  const result: Job[] = [];
  let changed = false;

  for (const group of byStatus.values()) {
    const sorted = [...group].sort((a, b) => {
      if (a.sortOrder !== undefined && b.sortOrder !== undefined) return a.sortOrder - b.sortOrder;
      if (a.sortOrder !== undefined) return -1;
      if (b.sortOrder !== undefined) return 1;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
    sorted.forEach((j, i) => {
      if (j.sortOrder !== i) changed = true;
      result.push({ ...j, sortOrder: i });
    });
  }

  return { jobs: result, changed };
}

// pointerWithin detects the droppable the cursor is physically inside (smallest rect
// wins, so a card beats its column). Fall back to closestCenter when the pointer is
// outside all droppables (e.g. slightly outside the board edge).
function detectCollision(args: Parameters<typeof pointerWithin>[0]) {
  const within = pointerWithin(args);
  return within.length > 0 ? within : closestCenter(args);
}

export default function KanbanBoard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addStatus, setAddStatus] = useState<JobStatus>('applied');
  const [detailJob, setDetailJob] = useState<Job | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const load = useCallback(() => {
    const raw = storage.getJobs();
    const { jobs: normalized, changed } = ensureSortOrders(raw);
    if (changed) storage.saveJobs(normalized);
    setJobs(normalized);
  }, []);

  useEffect(() => { load(); }, [load]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragStart(e: DragStartEvent) {
    setActiveJob(jobs.find((j) => j.id === e.active.id) ?? null);
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveJob(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;

    const draggedId = active.id as string;
    const overId    = over.id as string;
    const columnIds = KANBAN_COLUMNS.map((c) => c.id as string);

    const draggedJob = jobs.find((j) => j.id === draggedId);
    if (!draggedJob) return;

    // Which status did the card land in?
    const newStatus: JobStatus = columnIds.includes(overId)
      ? (overId as JobStatus)
      : (jobs.find((j) => j.id === overId)?.status ?? draggedJob.status);

    let updatedJobs: Job[];

    if (draggedJob.status === newStatus) {
      // ── Same column: reorder only ─────────────────────────────────────
      const colJobs = jobs
        .filter((j) => j.status === newStatus)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

      const fromIdx = colJobs.findIndex((j) => j.id === draggedId);
      // Dropping on the column background → move to end of column
      const toIdx = columnIds.includes(overId)
        ? colJobs.length - 1
        : colJobs.findIndex((j) => j.id === overId);

      if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return;

      const reordered = arrayMove(colJobs, fromIdx, toIdx);
      const orderMap  = new Map(reordered.map((j, i) => [j.id, i]));
      updatedJobs = jobs.map((j) =>
        orderMap.has(j.id) ? { ...j, sortOrder: orderMap.get(j.id)! } : j
      );
    } else {
      // ── Different column: status change + positional insert ───────────
      if (newStatus === 'recruiter_screen') awardPoints('status_recruiter_screen', draggedJob.id, `Recruiter screen earned for ${draggedJob.company}`);
      else if (newStatus === 'interviewing') awardPoints('status_interviewing', draggedJob.id);
      else if (newStatus === 'offer')        awardPoints('status_offer', draggedJob.id);
      else if (newStatus === 'rejected')     awardPoints('status_rejected', draggedJob.id);

      // Source column: gap-fill after removing dragged job
      const sourceJobs = jobs
        .filter((j) => j.status === draggedJob.status && j.id !== draggedId)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

      // Target column: find where to insert
      const targetJobs = jobs
        .filter((j) => j.status === newStatus && j.id !== draggedId)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

      // Insert before the card we dropped on; append if dropped on column bg
      let insertIdx = targetJobs.length;
      if (!columnIds.includes(overId)) {
        const overCardIdx = targetJobs.findIndex((j) => j.id === overId);
        if (overCardIdx !== -1) insertIdx = overCardIdx;
      }

      const newTargetOrder = [
        ...targetJobs.slice(0, insertIdx),
        draggedJob,
        ...targetJobs.slice(insertIdx),
      ];

      const sourceMap = new Map(sourceJobs.map((j, i) => [j.id, i]));
      const targetMap = new Map(newTargetOrder.map((j, i) => [j.id, i]));

      updatedJobs = jobs.map((j) => {
        if (j.id === draggedId)    return { ...j, status: newStatus, sortOrder: targetMap.get(j.id)!, updatedAt: now() };
        if (sourceMap.has(j.id))  return { ...j, sortOrder: sourceMap.get(j.id)! };
        if (targetMap.has(j.id))  return { ...j, sortOrder: targetMap.get(j.id)! };
        return j;
      });
    }

    // Optimistic update then persist
    setJobs(updatedJobs);
    storage.saveJobs(updatedJobs);
  }

  function openAdd(status: JobStatus) {
    setAddStatus(status);
    setAddOpen(true);
  }

  const sortedByOrder = (status: JobStatus) =>
    jobs
      .filter((j) => j.status === status)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-white">
        <div>
          <h1 className="text-xl font-bold text-stone-900 tracking-tight">Job Tracker</h1>
          <p className="text-stone-400 text-xs mt-0.5">
            {jobs.length === 0
              ? 'No applications yet'
              : `${jobs.length} application${jobs.length !== 1 ? 's' : ''} tracked`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setImportOpen(true)}
            className="flex items-center gap-2 border border-stone-200 text-stone-600 px-3.5 py-2 rounded-xl text-sm font-medium hover:bg-stone-50 hover:border-stone-300 active:scale-[0.97] transition-all"
          >
            <Upload size={14} strokeWidth={2} />
            Import
          </button>
          <button
            onClick={() => openAdd('applied')}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-violet-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:from-blue-600 hover:to-violet-700 active:scale-[0.97] transition-all shadow-sm"
          >
            <Plus size={15} strokeWidth={2.5} />
            Add Job
          </button>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={detectCollision}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 p-6 min-w-max h-full">
            {KANBAN_COLUMNS.map((col) => (
              <KanbanColumn
                key={col.id}
                column={col}
                jobs={sortedByOrder(col.id)}
                onAddJob={() => openAdd(col.id)}
                onSelectJob={setDetailJob}
              />
            ))}
          </div>

          <DragOverlay dropAnimation={{ duration: 180, easing: 'ease' }}>
            {activeJob && <JobCard job={activeJob} onSelect={() => {}} isDragging />}
          </DragOverlay>
        </DndContext>
      </div>

      <JobFormModal
        open={addOpen}
        onClose={() => { setAddOpen(false); load(); }}
        initialStatus={addStatus}
      />

      <ImportJobsModal
        open={importOpen}
        onClose={() => { setImportOpen(false); load(); }}
        onImported={load}
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
