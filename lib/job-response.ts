import type { Job, JobStatus } from './types';

/** Statuses that mean the employer responded (screen, interview, or offer). */
export const RESPONSE_PIPELINE_STATUSES: ReadonlySet<JobStatus> = new Set([
  'recruiter_screen',
  'interviewing',
  'offer',
]);

/**
 * Once true, stays true: merge DB prior + incoming patch for persistence.
 */
export function mergeHasResponseForSave(prior: Job | null | undefined, next: Job): Job {
  const hasResponse =
    prior?.hasResponse === true
    || next.hasResponse === true
    || RESPONSE_PIPELINE_STATUSES.has(next.status);
  return { ...next, hasResponse };
}
