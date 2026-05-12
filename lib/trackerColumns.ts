import type { JobStatus } from './types';
import { KANBAN_COLUMNS } from './types';

/** Default left-to-right tracker column order. */
export const DEFAULT_TRACKER_COLUMN_IDS: JobStatus[] = KANBAN_COLUMNS.map((c) => c.id);

const ID_SET = new Set<JobStatus>(DEFAULT_TRACKER_COLUMN_IDS);

function isJobStatus(s: string): s is JobStatus {
  return ID_SET.has(s as JobStatus);
}

/**
 * Validates and completes a stored column order (permutation of all 6 statuses).
 */
export function normalizeTrackerColumnOrder(raw: unknown): JobStatus[] {
  const seen = new Set<JobStatus>();
  const out: JobStatus[] = [];
  if (Array.isArray(raw)) {
    for (const x of raw) {
      if (typeof x !== 'string' || !isJobStatus(x) || seen.has(x)) continue;
      seen.add(x);
      out.push(x);
    }
  }
  for (const id of DEFAULT_TRACKER_COLUMN_IDS) {
    if (!seen.has(id)) out.push(id);
  }
  return out;
}
