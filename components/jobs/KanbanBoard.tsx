'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
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
import { SortableContext, arrayMove, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, RotateCcw, Upload, Target, Search, X } from 'lucide-react';
import { Job, JobStatus, KANBAN_COLUMNS } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { ensureSortOrders, sortJobsForColumn } from '@/lib/kanbanOrder';
import { DEFAULT_TRACKER_COLUMN_IDS, normalizeTrackerColumnOrder } from '@/lib/trackerColumns';
import { now } from '@/lib/utils';
import { awardPoints } from '@/lib/points';
import { autoGhostStaleApplications } from '@/lib/autoGhost';
import { jobMatchesTrackerSearch } from '@/lib/jobSearch';
import KanbanSortableColumn from './KanbanSortableColumn';
import JobCard from './JobCard';
import JobDetailModal from './JobDetailModal';
import ImportJobsModal from './ImportJobsModal';
import { useAchievementLevelUpRequest } from '@/components/achievements/AchievementLevelUpProvider';
import { useOpenAddJob } from '@/components/jobs/JobAddModalProvider';
import { subscribeJobsMutated } from '@/lib/jobsMutateEvents';

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

function useColumnReorderEnabled() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const sync = () => setEnabled(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  return enabled;
}

export default function KanbanBoard() {
  const openAddJob = useOpenAddJob();
  const { profile, refreshProfile } = useAuth();
  const requestAchievementLevelCheck = useAchievementLevelUpRequest();
  const appliedManualSort = profile?.appliedManualSort ?? false;
  const columnReorderEnabled = useColumnReorderEnabled();
  const [localColumnOrder, setLocalColumnOrder] = useState<JobStatus[]>(DEFAULT_TRACKER_COLUMN_IDS);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [activeColumnId, setActiveColumnId] = useState<JobStatus | null>(null);
  const [detailJob, setDetailJob] = useState<Job | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [jobSearch, setJobSearch] = useState('');

  const load = useCallback(async () => {
    const raw = await db.getJobs();
    const afterGhost = await autoGhostStaleApplications(raw);
    const { jobs: normalized, changed } = ensureSortOrders(afterGhost, appliedManualSort);
    if (changed) await db.saveJobs(normalized);
    setJobs(normalized);
    void requestAchievementLevelCheck();
  }, [appliedManualSort, requestAchievementLevelCheck]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    return subscribeJobsMutated(() => {
      void load();
    });
  }, [load]);

  useEffect(() => {
    setLocalColumnOrder(normalizeTrackerColumnOrder(profile?.trackerColumnOrder));
  }, [profile?.trackerColumnOrder]);

  const orderedColumns = useMemo(
    () => localColumnOrder.map((id) => KANBAN_COLUMNS.find((c) => c.id === id)).filter(Boolean) as typeof KANBAN_COLUMNS,
    [localColumnOrder],
  );

  const isCustomColumnOrder = useMemo(
    () => localColumnOrder.some((id, i) => id !== DEFAULT_TRACKER_COLUMN_IDS[i]),
    [localColumnOrder],
  );

  const sensors = useSensors(
    // Mouse: start drag after 8 px movement
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    // Touch: require a 200 ms long-press before drag starts so normal
    // scrolling still works on mobile
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  function handleDragStart(e: DragStartEvent) {
    if (e.active.data.current?.type === 'column') {
      setActiveColumnId(e.active.id as JobStatus);
      setActiveJob(null);
      return;
    }
    setActiveColumnId(null);
    setActiveJob(jobs.find((j) => j.id === e.active.id) ?? null);
  }

  async function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveJob(null);
    setActiveColumnId(null);
    if (!over || active.id === over.id) return;

    if (active.data.current?.type === 'column') {
      const activeCol = active.id as JobStatus;
      const overCol = over.id as JobStatus;
      if (!localColumnOrder.includes(activeCol) || !localColumnOrder.includes(overCol)) return;
      const fromIdx = localColumnOrder.indexOf(activeCol);
      const toIdx = localColumnOrder.indexOf(overCol);
      if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return;
      const next = arrayMove(localColumnOrder, fromIdx, toIdx);
      setLocalColumnOrder(next);
      if (profile) {
        const ts = now();
        await db.saveProfile({ ...profile, trackerColumnOrder: next, updatedAt: ts });
        await refreshProfile();
      }
      return;
    }

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
      const colJobs = sortJobsForColumn(newStatus, jobs, appliedManualSort);

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
      if (newStatus === 'recruiter_screen') await awardPoints('status_recruiter_screen', draggedJob.id, `Screen earned for ${draggedJob.company}`);
      else if (newStatus === 'interviewing') await awardPoints('status_interviewing', draggedJob.id);
      else if (newStatus === 'offer')        await awardPoints('status_offer', draggedJob.id);
      else if (newStatus === 'rejected')     await awardPoints('status_rejected', draggedJob.id);

      // Source column: gap-fill after removing dragged job
      const sourceJobs = sortJobsForColumn(
        draggedJob.status,
        jobs.filter((j) => j.id !== draggedId),
        appliedManualSort,
      );

      // Target column: find where to insert
      const targetJobs = sortJobsForColumn(
        newStatus,
        jobs.filter((j) => j.id !== draggedId),
        appliedManualSort,
      );

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
    void requestAchievementLevelCheck();

    if (
      draggedJob.status === newStatus
      && newStatus === 'applied'
      && profile
      && !profile.appliedManualSort
    ) {
      const ts = now();
      await db.saveProfile({ ...profile, appliedManualSort: true, updatedAt: ts });
      await refreshProfile();
    }
  }

  async function resetColumnOrder() {
    if (!profile) return;
    const ts = now();
    setLocalColumnOrder([...DEFAULT_TRACKER_COLUMN_IDS]);
    await db.saveProfile({ ...profile, trackerColumnOrder: undefined, updatedAt: ts });
    await refreshProfile();
  }

  const sortedByOrder = (status: JobStatus) =>
    sortJobsForColumn(status, jobs, appliedManualSort);

  const trackerTitle = getTrackerTitle(profile?.fullName);
  const totalApps    = jobs.length;
  const activeCount  = jobs.filter((j) => j.status === 'interviewing' || j.status === 'recruiter_screen').length;
  const offerCount   = jobs.filter((j) => j.status === 'offer').length;
  const followUps    = jobs.filter((j) => {
    if (j.status !== 'applied' || !j.dateApplied) return false;
    return (Date.now() - new Date(j.dateApplied).getTime()) > 7 * 86_400_000;
  }).length;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-gradient-to-b from-[#eceef8] via-[#f3f4fb] to-[#e8ecf4]">
      {/* ── Header (frosted — matches Dashboard shell) ── */}
      <div className="relative flex items-center justify-between overflow-x-clip border-b border-indigo-100/50 bg-white/72 px-4 py-3.5 shadow-[0_1px_0_rgba(255,255,255,0.85)_inset] backdrop-blur-md md:px-7 md:py-4">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-indigo-50/40 via-transparent to-amber-50/20" aria-hidden />
        <div className="pointer-events-none absolute -inset-1 bg-gradient-to-br from-blue-500/[0.05] to-violet-500/[0.06] blur-2xl" aria-hidden />

        <div className="relative min-w-0">
          <div className="group flex cursor-default items-center gap-2.5">
            <Target
              size={18}
              strokeWidth={2}
              className="shrink-0 text-indigo-500 transition-all duration-200 group-hover:scale-105 group-hover:text-violet-500"
            />
            <h1 className="bg-gradient-to-r from-slate-900 via-indigo-700 to-violet-700 bg-clip-text text-[1.35rem] font-extrabold leading-tight tracking-tight text-transparent md:text-[1.4rem]">
              {trackerTitle}
            </h1>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
            <p className="text-[11px] leading-none text-slate-500">
              Track your pipeline. Move jobs forward.
            </p>
            {totalApps > 0 && (
              <>
                <span className="text-[10px] text-slate-300">·</span>
                <span className="text-[11px] font-semibold leading-none text-sky-700 tabular-nums">
                  {totalApps} app{totalApps !== 1 ? 's' : ''}
                </span>
                {activeCount > 0 && (
                  <>
                    <span className="text-[10px] text-slate-300">·</span>
                    <span className="text-[11px] font-semibold leading-none text-indigo-600 tabular-nums">
                      {activeCount} active
                    </span>
                  </>
                )}
                {offerCount > 0 && (
                  <>
                    <span className="text-[10px] text-slate-300">·</span>
                    <span className="text-[11px] font-semibold leading-none text-emerald-700 tabular-nums">
                      {offerCount} offer{offerCount !== 1 ? 's' : ''}
                    </span>
                  </>
                )}
                {followUps > 0 && (
                  <>
                    <span className="text-[10px] text-slate-300">·</span>
                    <span className="text-[11px] font-semibold leading-none text-amber-600 tabular-nums">
                      {followUps} follow-up{followUps !== 1 ? 's' : ''} needed
                    </span>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        <div className="relative flex shrink-0 items-center gap-2">
          {columnReorderEnabled && isCustomColumnOrder && (
            <button
              type="button"
              onClick={() => void resetColumnOrder()}
              className="hidden items-center gap-1.5 rounded-xl border border-transparent px-2.5 py-2 text-xs font-medium text-slate-500 transition-all hover:border-slate-200/90 hover:bg-white/80 hover:text-slate-800 active:scale-[0.97] md:inline-flex"
              title="Restore default column order"
            >
              <RotateCcw size={14} strokeWidth={2} />
              <span>Reset columns</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-slate-200/90 bg-white/90 px-2.5 py-2 text-sm font-medium text-slate-600 shadow-sm transition-all hover:border-indigo-200/80 hover:bg-white hover:text-slate-800 active:scale-[0.97] md:px-3.5"
          >
            <Upload size={14} strokeWidth={2} />
            <span className="hidden sm:inline">Import</span>
          </button>
          <button
            type="button"
            onClick={() => openAddJob('applied')}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-slate-900 via-indigo-600 to-violet-700 px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_28px_-8px_rgba(79,70,229,0.4)] transition-all hover:shadow-[0_10px_32px_-8px_rgba(67,56,202,0.45)] active:scale-[0.97]"
          >
            <Plus size={15} strokeWidth={2.5} />
            Add Job
          </button>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 border-b border-slate-200/55 bg-white/55 px-4 py-2.5 backdrop-blur-sm md:px-7">
        <div className="flex min-w-0 flex-1 items-center gap-2.5 rounded-2xl border border-slate-200/80 bg-white/90 px-3 py-2 shadow-sm transition-shadow focus-within:border-indigo-300/70 focus-within:ring-2 focus-within:ring-indigo-200/50">
          <Search size={17} className="shrink-0 text-slate-400" strokeWidth={2} aria-hidden />
          <input
            type="search"
            value={jobSearch}
            onChange={(e) => setJobSearch(e.target.value)}
            placeholder={'Search company\u2026'}
            className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-0"
            aria-label="Search jobs by company or role"
          />
        </div>
        {jobSearch.trim() !== '' && (
          <button
            type="button"
            onClick={() => setJobSearch('')}
            className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm transition-all hover:border-indigo-200/70 hover:bg-indigo-50/50 active:scale-[0.98]"
          >
            <X size={14} strokeWidth={2} />
            Clear
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-x-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={detectCollision}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={localColumnOrder} strategy={horizontalListSortingStrategy}>
            <div className="flex min-h-full min-w-max gap-5 px-5 py-6 pb-10 md:gap-6 md:px-8 md:py-8">
              {orderedColumns.map((col) => {
                const fullColumn = sortedByOrder(col.id);
                const visibleJobs = jobSearch.trim()
                  ? fullColumn.filter((j) => jobMatchesTrackerSearch(j, jobSearch))
                  : fullColumn;
                const emptyWhenFiltered =
                  jobSearch.trim() && fullColumn.length > 0 && visibleJobs.length === 0
                    ? 'No matching companies found.'
                    : undefined;
                return (
                  <KanbanSortableColumn
                    key={col.id}
                    column={col}
                    jobs={visibleJobs}
                    emptyWhenFiltered={emptyWhenFiltered}
                    onAddJob={() => openAddJob(col.id)}
                    onSelectJob={setDetailJob}
                    reorderEnabled={columnReorderEnabled}
                  />
                );
              })}
            </div>
          </SortableContext>

          <DragOverlay dropAnimation={{ duration: 200, easing: 'ease-out' }}>
            {activeJob && <JobCard job={activeJob} onSelect={() => {}} isDragging />}
            {!activeJob && activeColumnId && (
              <div className="flex w-64 flex-col rounded-2xl border border-indigo-200/70 bg-white/92 px-3.5 py-3 shadow-[0_24px_48px_-12px_rgba(67,56,202,0.25)] ring-2 ring-indigo-300/35 backdrop-blur-md">
                <span className="text-[13px] font-semibold tracking-tight text-slate-800">
                  {KANBAN_COLUMNS.find((c) => c.id === activeColumnId)?.label ?? activeColumnId}
                </span>
                <span className="mt-1 text-[11px] text-slate-500">Moving column…</span>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

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
