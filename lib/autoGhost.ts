import { Job } from './types';
import { db } from './db';
import { now } from './utils';

export const GHOST_AFTER_DAYS = 21;

/** Days since application date (falls back to createdAt if dateApplied is absent). */
export function applicationAgeDays(job: Job): number {
  const ref = job.dateApplied ?? job.createdAt;
  return Math.floor((Date.now() - new Date(ref).getTime()) / 86_400_000);
}

/**
 * Moves "applied" jobs that are GHOST_AFTER_DAYS or older to "ghosted".
 * Persists only the changed rows. Safe to call multiple times — already-ghosted
 * jobs are never touched.
 */
export async function autoGhostStaleApplications(jobs: Job[]): Promise<Job[]> {
  const ts = now();
  const toUpdate: Job[] = [];

  const result = jobs.map((j) => {
    if (j.status === 'applied' && applicationAgeDays(j) >= GHOST_AFTER_DAYS) {
      const updated: Job = { ...j, status: 'ghosted', updatedAt: ts };
      toUpdate.push(updated);
      return updated;
    }
    return j;
  });

  if (toUpdate.length > 0) {
    await db.saveJobs(toUpdate);
  }

  return result;
}
