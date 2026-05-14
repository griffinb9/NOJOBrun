import type { Job } from './types';

/** Case-insensitive partial match on company, then role. */
export function jobMatchesTrackerSearch(job: Job, rawQuery: string): boolean {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return true;
  const company = (job.company ?? '').toLowerCase();
  const role = (job.role ?? '').toLowerCase();
  return company.includes(q) || role.includes(q);
}
