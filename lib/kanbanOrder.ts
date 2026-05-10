import type { Job, JobStatus } from './types';

/** Timestamp for Applied auto-sort: dateApplied, else createdAt; invalid → bottom (0). */
export function appliedAutoSortTs(j: Job): number {
  const ref = j.dateApplied ?? j.createdAt;
  const t = new Date(ref).getTime();
  return Number.isFinite(t) ? t : 0;
}

/** Newest / strongest dates first; stable tie-break on id. */
export function compareAppliedByDateDesc(a: Job, b: Job): number {
  const d = appliedAutoSortTs(b) - appliedAutoSortTs(a);
  if (d !== 0) return d;
  return a.id.localeCompare(b.id);
}

/**
 * Column order as shown on the board (must match drag-and-drop list order).
 */
export function sortJobsForColumn(status: JobStatus, jobs: Job[], appliedManualSort: boolean): Job[] {
  const inCol = jobs.filter((j) => j.status === status);
  if (status === 'applied' && !appliedManualSort) {
    return [...inCol].sort(compareAppliedByDateDesc);
  }
  return [...inCol].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

/**
 * Normalizes sortOrder to 0..n-1 per status.
 * Applied + auto: order by application date desc (fallback createdAt), invalid dates last.
 * Applied + manual: jobs without sortOrder go to the top (date desc among those), then prior manual order.
 * Other columns: unchanged behavior (sortOrder, then createdAt).
 */
export function ensureSortOrders(rawJobs: Job[], appliedManualSort: boolean): { jobs: Job[]; changed: boolean } {
  const byStatus = new Map<JobStatus, Job[]>();
  for (const j of rawJobs) {
    const g = byStatus.get(j.status) ?? [];
    g.push(j);
    byStatus.set(j.status, g);
  }

  const result: Job[] = [];
  let changed = false;

  for (const [status, group] of byStatus) {
    if (status === 'applied' && !appliedManualSort) {
      const sorted = [...group].sort(compareAppliedByDateDesc);
      sorted.forEach((j, i) => {
        if (j.sortOrder !== i) changed = true;
        result.push({ ...j, sortOrder: i });
      });
      continue;
    }

    if (status === 'applied' && appliedManualSort) {
      const withOrder = group.filter((j) => j.sortOrder !== undefined);
      const withoutOrder = group.filter((j) => j.sortOrder === undefined);
      withOrder.sort((a, b) => a.sortOrder! - b.sortOrder!);
      withoutOrder.sort(compareAppliedByDateDesc);
      const merged = [...withoutOrder, ...withOrder];
      merged.forEach((j, i) => {
        if (j.sortOrder !== i) changed = true;
        result.push({ ...j, sortOrder: i });
      });
      continue;
    }

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
