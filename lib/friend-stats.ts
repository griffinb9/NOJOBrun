import { computeAllAchievements } from './achievements';
import type { Job, PointEvent, Story } from './types';
import { streakCalendarDateForJob } from './job-streak';

/** Max count of eligible (applied) applications on a single calendar day. */
export function maxApplicationsInOneDay(jobs: Job[]): number {
  const counts = new Map<string, number>();
  for (const job of jobs) {
    const d = streakCalendarDateForJob(job);
    if (!d) continue;
    counts.set(d, (counts.get(d) ?? 0) + 1);
  }
  let max = 0;
  for (const c of counts.values()) max = Math.max(max, c);
  return max;
}

export function countUnlockedAchievements(
  jobs: Job[],
  pointEvents: PointEvent[],
  stories: Story[],
): number {
  return computeAllAchievements({ jobs, pointEvents, stories }).filter((a) => a.count > 0).length;
}
