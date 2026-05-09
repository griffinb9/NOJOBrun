'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  closestCenter,
  pointerWithin,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { Plus, Upload, Target } from 'lucide-react';
import { Job, JobStatus, KANBAN_COLUMNS } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { now } from '@/lib/utils';
import { awardPoints } from '@/lib/points';
import { autoGhostStaleApplications } from '@/lib/autoGhost';
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

function getTrackerTitle(fullName?: string | null): string {
  const name = fullName?.trim();
  if (!name) return 'My Job Tracker';
  const firstName = name.split(/\s+/)[0];
  return `${firstName}'s Job Tracker`;
}

// pointerWithin detects the droppable the cursor is physically inside (smallest rect
// wins, so a card beats its column). Fall back to closestCenter when the pointer is
// outside all droppables (e.g. slightly outside the board edge).
function detectCollision(args: Parameters<typeof pointerWithin>[0]) {
  const within = pointerWithin(args);
  return within.length > 0 ? within : closestCenter(args);
}

export default function KanbanBoard() {
  const { profile } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addStatus, setAddStatus] = useState<JobStatus>('applied');
  const [detailJob, setDetailJob] = useState<Job | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const load = useCallback(async () => {
    const raw = await db.getJobs();
    const afterGhost = await autoGhostStaleApplications(raw);
    const { jobs: normalized, changed } = ensureSortOrders(afterGhost);
    if (changed) await db.saveJobs(normalized);
    setJobs(normalized);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sensors = useSensors(
    // Mouse: start drag after 8 px movement
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    // Touch: require a 200 ms long-press before drag starts so normal
    // scrolling still works on mobile
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  function handleDragStart(e: DragStartEvent) {
    setActiveJob(jobs.find((j) => j.id === e.active.id) ?? null);
  }

  async function handleDragEnd(e: DragEndEvent) {
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
      if (newStatus === 'recruiter_screen') await awardPoints('status_recruiter_screen', draggedJob.id, `Recruiter screen earned for ${draggedJob.company}`);
      else if (newStatus === 'interviewing') await awardPoints('status_interviewing', draggedJob.id);
      else if (newStatus === 'offer')        await awardPoints('status_offer', draggedJob.id);
      else if (newStatus === 'rejected')     await awardPoints('status_rejected', draggedJob.id);

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
    await db.saveJobs(updatedJobs);
  }

  function openAdd(status: JobStatus) {
    setAddStatus(status);
    setAddOpen(true);
  }

  const sortedByOrder = (status: JobStatus) =>
    jobs
      .filter((j) => j.status === status)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  const trackerTitle = getTrackerTitle(profile?.fullName);
  const totalApps    = jobs.length;
  const activeCount  = jobs.filter((j) => j.status === 'interviewing' || j.status === 'recruiter_screen').length;
  const offerCount   = jobs.filter((j) => j.status === 'offer').length;
  const followUps    = jobs.filter((j) => {
    if (j.status !== 'applied' || !j.dateApplied) return false;
    return (Date.now() - new Date(j.dateApplied).getTime()) > 7 * 86_400_000;
  }).length;

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <div className="relative flex items-center justify-between px-4 py-3 md:px-6 md:py-4 border-b border-stone-100 bg-white overflow-hidden">
        {/* Background glow blob */}
        <div className="absolute -inset-2 bg-gradient-to-br from-blue-500/[0.04] to-violet-500/[0.06] blur-2xl pointer-events-none" />

        {/* Left: title + stats */}
        <div className="relative">
          <div className="flex items-center gap-2 group cursor-default">
            <Target
              size={18}
              strokeWidth={2}
              className="text-violet-500 shrink-0 transition-all duration-200 group-hover:scale-110 group-hover:text-violet-400"
            />
            <h1 className="text-[1.35rem] font-extrabold tracking-tight leading-tight bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent transition-opacity duration-200 group-hover:opacity-80">
              {trackerTitle}
            </h1>
          </div>

          {/* Subtitle + inline stats */}
          <div className="flex items-center flex-wrap gap-x-2.5 gap-y-0.5 mt-1">
            <p className="text-[11px] text-stone-400 leading-none">
              Track your pipeline. Move jobs forward.
            </p>
            {totalApps > 0 && (
              <>
                <span className="text-stone-300 text-[10px]">·</span>
                <span className="text-[11px] font-semibold text-blue-600 leading-none tabular-nums">
                  {totalApps} app{totalApps !== 1 ? 's' : ''}
                </span>
                {activeCount > 0 && (
                  <>
                    <span className="text-stone-300 text-[10px]">·</span>
                    <span className="text-[11px] font-semibold text-violet-600 leading-none tabular-nums">
                      {activeCount} active
                    </span>
                  </>
                )}
                {offerCount > 0 && (
                  <>
                    <span className="text-stone-300 text-[10px]">·</span>
                    <span className="text-[11px] font-semibold text-emerald-600 leading-none tabular-nums">
                      {offerCount} offer{offerCount !== 1 ? 's' : ''}
                    </span>
                  </>
                )}
                {followUps > 0 && (
                  <>
                    <span className="text-stone-300 text-[10px]">·</span>
                    <span className="text-[11px] font-semibold text-amber-500 leading-none tabular-nums">
                      {followUps} follow-up{followUps !== 1 ? 's' : ''} needed
                    </span>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right: action buttons */}
        <div className="relative flex items-center gap-2">
          <button
            onClick={() => setImportOpen(true)}
            className="flex items-center gap-2 border border-stone-200 text-stone-600 px-2.5 md:px-3.5 py-2 rounded-xl text-sm font-medium hover:bg-stone-50 hover:border-stone-300 active:scale-[0.97] transition-all"
          >
            <Upload size={14} strokeWidth={2} />
            <span className="hidden sm:inline">Import</span>
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
