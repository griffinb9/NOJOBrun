import type { Job } from './types';

export interface JobStreakSummary {
  currentStreak: number;
  longestStreak: number;
  appliedToday: boolean;
  /** Raw count of eligible applications dated today (display caps at 1 for “per day”). */
  jobsAppliedToday: number;
  /** Most recent calendar day in the active chain (today if applied today, else yesterday if streak continues). */
  lastStreakDate: string | null;
}

function localYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseYmdLocal(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

function addDaysYmd(ymd: string, delta: number): string {
  const t = parseYmdLocal(ymd);
  t.setDate(t.getDate() + delta);
  return localYmd(t);
}

export function streakTodayLocalYmd(): string {
  return localYmd(new Date());
}

/**
 * Only rows still in "applied" count. Uses date_applied when present (calendar YYYY-MM-DD),
 * otherwise the local calendar date of created_at.
 */
export function streakCalendarDateForJob(job: Job): string | null {
  if (job.status !== 'applied') return null;
  const da = job.dateApplied?.trim();
  if (da && /^\d{4}-\d{2}-\d{2}$/.test(da)) return da;
  return localYmd(new Date(job.createdAt));
}

const WEEK_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

export interface WeekStreakDay {
  label: string;
  ymd: string;
  completed: boolean;
  isToday: boolean;
  /** Local Monday-based week: past day without apply (not today, not future). */
  isMissed: boolean;
  /** Day is after today in the same calendar week. */
  isFuture: boolean;
}

/** Start of week (Monday) for `ref`, local calendar, noon to avoid DST edges. */
function startOfWeekMonday(ref: Date): Date {
  const x = new Date(ref);
  x.setHours(12, 0, 0, 0);
  const dow = x.getDay();
  const offset = dow === 0 ? -6 : 1 - dow;
  x.setDate(x.getDate() + offset);
  return x;
}

/**
 * Mon–Sun for the current week (local), using the same eligibility rules as {@link computeJobStreak}.
 */
export function computeWeekStreakDays(jobs: Job[]): WeekStreakDay[] {
  const todayYmd = streakTodayLocalYmd();
  const eligible = new Set<string>();
  for (const job of jobs) {
    const d = streakCalendarDateForJob(job);
    if (d) eligible.add(d);
  }

  const monday = startOfWeekMonday(new Date());
  const out: WeekStreakDay[] = [];

  for (let i = 0; i < 7; i++) {
    const dt = new Date(monday);
    dt.setDate(monday.getDate() + i);
    const ymd = localYmd(dt);
    const completed = eligible.has(ymd);
    const isToday = ymd === todayYmd;
    const cmp = ymd.localeCompare(todayYmd);
    const isFuture = cmp > 0;
    const isMissed = cmp < 0 && !completed && !isToday;
    out.push({
      label: isToday ? 'Today' : WEEK_SHORT[i],
      ymd,
      completed,
      isToday,
      isMissed,
      isFuture,
    });
  }

  return out;
}

export function computeJobStreak(jobs: Job[]): JobStreakSummary {
  const today = streakTodayLocalYmd();
  const dates = new Set<string>();
  let jobsAppliedToday = 0;

  for (const job of jobs) {
    const d = streakCalendarDateForJob(job);
    if (!d) continue;
    dates.add(d);
    if (d === today) jobsAppliedToday += 1;
  }

  const appliedToday = jobsAppliedToday > 0;

  let anchor: string | null = null;
  if (dates.has(today)) anchor = today;
  else {
    const yest = addDaysYmd(today, -1);
    if (dates.has(yest)) anchor = yest;
  }

  let currentStreak = 0;
  if (anchor) {
    let d = anchor;
    while (dates.has(d)) {
      currentStreak += 1;
      d = addDaysYmd(d, -1);
    }
  }

  const sorted = [...dates].sort();
  let longestStreak = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of sorted) {
    if (prev && addDaysYmd(prev, 1) === d) run += 1;
    else run = 1;
    longestStreak = Math.max(longestStreak, run);
    prev = d;
  }

  return {
    currentStreak,
    longestStreak,
    appliedToday,
    jobsAppliedToday,
    lastStreakDate: anchor,
  };
}
