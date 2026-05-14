import { PointEvent, Story, Job } from './types';

export type TierName =
  | 'Bronze 1' | 'Bronze 2' | 'Bronze 3'
  | 'Silver 1' | 'Silver 2' | 'Silver 3'
  | 'Gold 1' | 'Gold 2' | 'Gold 3'
  | 'Platinum 1' | 'Platinum 2' | 'Platinum 3';

export interface Tier {
  name: TierName;
  min: number;
}

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  unit: string;  // singular, e.g. "job applied"
  tiers: Tier[];
}

export interface ComputedAchievement extends AchievementDef {
  count: number;
  currentTier: Tier;
  nextTier: Tier | null;
  progressPercent: number;
  toNextTier: number | null;
  /** True when count is below the first tier threshold (e.g. 0 rejections before Bronze I). */
  preFirstTier?: boolean;
}

export interface TierStyle {
  badge: string;
  bar: string;
  accent: string;
  borderTop: string;
  iconBg: string;
  iconColor: string;
}

export const TIER_STYLE: Record<string, TierStyle> = {
  'Bronze 1': { badge: 'bg-amber-100 text-amber-700 border-amber-200', bar: 'bg-amber-400', accent: 'text-amber-700', borderTop: 'border-t-amber-400', iconBg: 'bg-amber-100', iconColor: 'text-amber-600' },
  'Bronze 2': { badge: 'bg-amber-100 text-amber-700 border-amber-200', bar: 'bg-amber-400', accent: 'text-amber-700', borderTop: 'border-t-amber-400', iconBg: 'bg-amber-100', iconColor: 'text-amber-600' },
  'Bronze 3': { badge: 'bg-amber-100 text-amber-700 border-amber-200', bar: 'bg-amber-500', accent: 'text-amber-700', borderTop: 'border-t-amber-500', iconBg: 'bg-amber-100', iconColor: 'text-amber-700' },
  'Silver 1': { badge: 'bg-slate-100 text-slate-600 border-slate-200', bar: 'bg-slate-400', accent: 'text-slate-600', borderTop: 'border-t-slate-400', iconBg: 'bg-slate-100', iconColor: 'text-slate-500' },
  'Silver 2': { badge: 'bg-slate-100 text-slate-600 border-slate-200', bar: 'bg-slate-400', accent: 'text-slate-600', borderTop: 'border-t-slate-400', iconBg: 'bg-slate-100', iconColor: 'text-slate-500' },
  'Silver 3': { badge: 'bg-slate-100 text-slate-600 border-slate-200', bar: 'bg-slate-500', accent: 'text-slate-600', borderTop: 'border-t-slate-500', iconBg: 'bg-slate-100', iconColor: 'text-slate-600' },
  'Gold 1':   { badge: 'bg-yellow-100 text-yellow-700 border-yellow-200', bar: 'bg-yellow-400', accent: 'text-yellow-700', borderTop: 'border-t-yellow-400', iconBg: 'bg-yellow-100', iconColor: 'text-yellow-600' },
  'Gold 2':   { badge: 'bg-yellow-100 text-yellow-700 border-yellow-200', bar: 'bg-yellow-400', accent: 'text-yellow-700', borderTop: 'border-t-yellow-400', iconBg: 'bg-yellow-100', iconColor: 'text-yellow-600' },
  'Gold 3':   { badge: 'bg-yellow-100 text-yellow-700 border-yellow-200', bar: 'bg-yellow-500', accent: 'text-yellow-700', borderTop: 'border-t-yellow-500', iconBg: 'bg-yellow-100', iconColor: 'text-yellow-700' },
  'Platinum 1': { badge: 'bg-violet-100 text-violet-700 border-violet-200', bar: 'bg-violet-500', accent: 'text-violet-700', borderTop: 'border-t-violet-500', iconBg: 'bg-violet-100', iconColor: 'text-violet-600' },
  'Platinum 2': { badge: 'bg-violet-100 text-violet-800 border-violet-300', bar: 'bg-violet-600', accent: 'text-violet-800', borderTop: 'border-t-violet-600', iconBg: 'bg-violet-100', iconColor: 'text-violet-700' },
  'Platinum 3': { badge: 'bg-violet-100 text-violet-900 border-violet-300', bar: 'bg-violet-600', accent: 'text-violet-900', borderTop: 'border-t-violet-600', iconBg: 'bg-violet-100', iconColor: 'text-violet-800' },
};

function platinumThree(gold3Min: number, platinum1Min: number): Tier[] {
  const span = Math.max(1, platinum1Min - gold3Min);
  const step = Math.max(1, Math.round(span / 3));
  return [
    { name: 'Platinum 1', min: platinum1Min },
    { name: 'Platinum 2', min: platinum1Min + step },
    { name: 'Platinum 3', min: platinum1Min + step * 2 },
  ];
}

const TIERS_JOBS_APPLIED: Tier[] = [
  { name: 'Bronze 1', min: 0 },
  { name: 'Bronze 2', min: 5 },
  { name: 'Bronze 3', min: 15 },
  { name: 'Silver 1', min: 50 },
  { name: 'Silver 2', min: 75 },
  { name: 'Silver 3', min: 100 },
  { name: 'Gold 1',   min: 150 },
  { name: 'Gold 2',   min: 200 },
  { name: 'Gold 3',   min: 300 },
  ...platinumThree(300, 500),
];

const TIERS_RECRUITER_SCREENS: Tier[] = [
  { name: 'Bronze 1', min: 0 },
  { name: 'Bronze 2', min: 1 },
  { name: 'Bronze 3', min: 3 },
  { name: 'Silver 1', min: 5 },
  { name: 'Silver 2', min: 8 },
  { name: 'Silver 3', min: 11 },
  { name: 'Gold 1',   min: 15 },
  { name: 'Gold 2',   min: 20 },
  { name: 'Gold 3',   min: 30 },
  ...platinumThree(30, 50),
];

const TIERS_INTERVIEWS: Tier[] = [
  { name: 'Bronze 1', min: 0 },
  { name: 'Bronze 2', min: 1 },
  { name: 'Bronze 3', min: 3 },
  { name: 'Silver 1', min: 5 },
  { name: 'Silver 2', min: 8 },
  { name: 'Silver 3', min: 11 },
  { name: 'Gold 1',   min: 15 },
  { name: 'Gold 2',   min: 20 },
  { name: 'Gold 3',   min: 30 },
  ...platinumThree(30, 50),
];

const TIERS_OFFERS: Tier[] = [
  { name: 'Bronze 1', min: 0 },
  { name: 'Bronze 2', min: 1 },
  { name: 'Bronze 3', min: 2 },
  { name: 'Silver 1', min: 3 },
  { name: 'Silver 2', min: 4 },
  { name: 'Silver 3', min: 5 },
  { name: 'Gold 1',   min: 6 },
  { name: 'Gold 2',   min: 8 },
  { name: 'Gold 3',   min: 10 },
  ...platinumThree(10, 15),
];

const TIERS_FOLLOW_UPS: Tier[] = [
  { name: 'Bronze 1', min: 0 },
  { name: 'Bronze 2', min: 3 },
  { name: 'Bronze 3', min: 6 },
  { name: 'Silver 1', min: 10 },
  { name: 'Silver 2', min: 15 },
  { name: 'Silver 3', min: 25 },
  { name: 'Gold 1',   min: 40 },
  { name: 'Gold 2',   min: 60 },
  { name: 'Gold 3',   min: 90 },
  ...platinumThree(90, 150),
];

const TIERS_PREP_KITS: Tier[] = [
  { name: 'Bronze 1', min: 0 },
  { name: 'Bronze 2', min: 1 },
  { name: 'Bronze 3', min: 3 },
  { name: 'Silver 1', min: 5 },
  { name: 'Silver 2', min: 8 },
  { name: 'Silver 3', min: 11 },
  { name: 'Gold 1',   min: 15 },
  { name: 'Gold 2',   min: 20 },
  { name: 'Gold 3',   min: 30 },
  ...platinumThree(30, 50),
];

const TIERS_STAR_STORIES: Tier[] = [
  { name: 'Bronze 1', min: 0 },
  { name: 'Bronze 2', min: 1 },
  { name: 'Bronze 3', min: 3 },
  { name: 'Silver 1', min: 5 },
  { name: 'Silver 2', min: 7 },
  { name: 'Silver 3', min: 9 },
  { name: 'Gold 1',   min: 11 },
  { name: 'Gold 2',   min: 14 },
  { name: 'Gold 3',   min: 17 },
  ...platinumThree(17, 21),
];

const TIERS_MAX_APPS_ONE_DAY: Tier[] = [
  { name: 'Bronze 1', min: 0 },
  { name: 'Bronze 2', min: 3 },
  { name: 'Bronze 3', min: 10 },
  { name: 'Silver 1', min: 15 },
  { name: 'Silver 2', min: 20 },
  { name: 'Silver 3', min: 30 },
  { name: 'Gold 1', min: 40 },
  { name: 'Gold 2', min: 50 },
  { name: 'Gold 3', min: 75 },
  { name: 'Platinum 1', min: 100 },
  { name: 'Platinum 2', min: 150 },
  { name: 'Platinum 3', min: 250 },
];

/** Consecutive-day run (calendar); friend-visible tier ladder. */
const TIERS_LONGEST_STREAK: Tier[] = [
  { name: 'Bronze 1', min: 0 },
  { name: 'Bronze 2', min: 3 },
  { name: 'Bronze 3', min: 7 },
  { name: 'Silver 1', min: 14 },
  { name: 'Silver 2', min: 21 },
  { name: 'Silver 3', min: 30 },
  { name: 'Gold 1', min: 45 },
  { name: 'Gold 2', min: 60 },
  { name: 'Gold 3', min: 90 },
  ...platinumThree(90, 120),
];

/** Logged rejections only (applications.status = rejected). First tier starts at 1. */
const TIERS_RESILIENCE: Tier[] = [
  { name: 'Bronze 1', min: 1 },
  { name: 'Bronze 2', min: 5 },
  { name: 'Bronze 3', min: 10 },
  { name: 'Silver 1', min: 25 },
  { name: 'Silver 2', min: 50 },
  { name: 'Silver 3', min: 75 },
  { name: 'Gold 1', min: 100 },
  { name: 'Gold 2', min: 150 },
  { name: 'Gold 3', min: 250 },
  { name: 'Platinum 1', min: 400 },
  { name: 'Platinum 2', min: 600 },
  { name: 'Platinum 3', min: 1000 },
];

export const LONGEST_STREAK_ACHIEVEMENT_DEF: AchievementDef = {
  id: 'longest_streak',
  name: 'Longest Streak',
  description: 'Best consecutive days with applications logged.',
  unit: 'day',
  tiers: TIERS_LONGEST_STREAK,
};

/** Order used on friend public profile (matches product copy). */
export const FRIEND_ACHIEVEMENT_DISPLAY_ORDER = [
  'jobs_applied',
  'recruiter_screens',
  'interviews',
  'offers',
  'follow_ups',
  'resilience',
  'prep_kits',
  'star_stories',
  'longest_streak',
  'max_apps_one_day',
] as const;

export type FriendAchievementDisplayId = (typeof FRIEND_ACHIEVEMENT_DISPLAY_ORDER)[number];

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  {
    id: 'jobs_applied',
    name: 'Applications Sent',
    description: 'Every application is a step forward. Volume builds luck.',
    unit: 'application',
    tiers: TIERS_JOBS_APPLIED,
  },
  {
    id: 'max_apps_one_day',
    name: 'Most Applications in a Day',
    description: 'How many applications can you send in one day?',
    unit: 'application',
    tiers: TIERS_MAX_APPS_ONE_DAY,
  },
  {
    id: 'recruiter_screens',
    name: 'Screens',
    description: 'Getting past the initial filter is a real signal.',
    unit: 'screen',
    tiers: TIERS_RECRUITER_SCREENS,
  },
  {
    id: 'interviews',
    name: 'Interviews Landed',
    description: 'Each interview sharpens your edge for the next.',
    unit: 'interview',
    tiers: TIERS_INTERVIEWS,
  },
  {
    id: 'offers',
    name: 'Offers Received',
    description: 'The only metric that truly matters at the end.',
    unit: 'offer',
    tiers: TIERS_OFFERS,
  },
  {
    id: 'follow_ups',
    name: 'Follow-Ups Sent',
    description: 'The follow-up separates the persistent from the passive.',
    unit: 'follow-up',
    tiers: TIERS_FOLLOW_UPS,
  },
  {
    id: 'resilience',
    name: 'Resilience',
    description: 'Every rejection gets you closer.',
    unit: 'rejection',
    tiers: TIERS_RESILIENCE,
  },
  {
    id: 'prep_kits',
    name: 'Prep Kits Generated',
    description: 'Preparation is the difference between hoping and knowing.',
    unit: 'prep kit',
    tiers: TIERS_PREP_KITS,
  },
  {
    id: 'star_stories',
    name: 'STAR Stories Banked',
    description: 'A strong story bank means you\'re never caught off guard.',
    unit: 'story',
    tiers: TIERS_STAR_STORIES,
  },
];

function toRomanNumeral(num: number): string {
  const map = [
    { value: 10, symbol: 'X' },
    { value: 9, symbol: 'IX' },
    { value: 5, symbol: 'V' },
    { value: 4, symbol: 'IV' },
    { value: 1, symbol: 'I' },
  ];
  let n = num;
  let result = '';
  for (const { value, symbol } of map) {
    while (n >= value) {
      result += symbol;
      n -= value;
    }
  }
  return result;
}

/** "Bronze 1" → "Bronze I" for achievement tier pills and copy. */
export function formatTierNameDisplay(tierName: string): string {
  const match = tierName.match(/^(.*)\s(\d+)$/);
  if (!match) return tierName;
  return `${match[1]} ${toRomanNumeral(parseInt(match[2], 10))}`;
}

export function achievementTierPillText(a: ComputedAchievement): string {
  if (a.preFirstTier) return 'On your path';
  return formatTierNameDisplay(a.currentTier.name);
}

/** Stored in DB for pre–first-tier resilience-style ladders (rank -1). */
export const PREFIRST_TIER_TOKEN = '__prefirst__';

export function achievementTierToken(a: ComputedAchievement): string {
  if (a.preFirstTier) return PREFIRST_TIER_TOKEN;
  return a.currentTier.name;
}

export function achievementTierRankForToken(def: AchievementDef, tierToken: string): number {
  if (tierToken === PREFIRST_TIER_TOKEN) return -1;
  const i = def.tiers.findIndex((t) => t.name === tierToken);
  return i >= 0 ? i : -1;
}

export function getAchievementDefById(id: string): AchievementDef | undefined {
  return ACHIEVEMENT_DEFS.find((d) => d.id === id);
}

export function computeAchievement(def: AchievementDef, count: number): ComputedAchievement {
  const tiers = def.tiers;
  const safeCount = Math.max(0, Math.floor(Number(count)));

  if (tiers.length === 0) {
    throw new Error('achievement has no tiers');
  }

  if (tiers[0].min > 0 && safeCount < tiers[0].min) {
    const nextTier = tiers[0];
    const denom = Math.max(1, nextTier.min);
    const progressPercent = Math.min(99, Math.round((safeCount / denom) * 100));
    const toNextTier = nextTier.min - safeCount;
    return {
      ...def,
      count: safeCount,
      currentTier: { name: 'Bronze 1', min: 0 },
      nextTier,
      progressPercent,
      toNextTier,
      preFirstTier: true,
    };
  }

  // Highest tier whose min <= count
  let currentIdx = 0;
  for (let i = tiers.length - 1; i >= 0; i--) {
    if (safeCount >= tiers[i].min) {
      currentIdx = i;
      break;
    }
  }

  const currentTier = tiers[currentIdx];
  const nextTier = currentIdx < tiers.length - 1 ? tiers[currentIdx + 1] : null;

  let progressPercent = 100;
  let toNextTier: number | null = null;

  if (nextTier) {
    const rangeStart = currentTier.min;
    const rangeEnd = nextTier.min;
    const span = Math.max(1, rangeEnd - rangeStart);
    progressPercent = Math.min(100, Math.round(((safeCount - rangeStart) / span) * 100));
    toNextTier = rangeEnd - safeCount;
  }

  return {
    ...def,
    count: safeCount,
    currentTier,
    nextTier,
    progressPercent,
    toNextTier,
    preFirstTier: false,
  };
}

export function computeFriendAchievementsFromCounts(
  counts: Partial<Record<FriendAchievementDisplayId | string, number>>,
): ComputedAchievement[] {
  return FRIEND_ACHIEVEMENT_DISPLAY_ORDER.map((id) => {
    const c = Math.max(0, Math.floor(Number(counts[id] ?? 0)));
    if (id === 'longest_streak') {
      return computeAchievement(LONGEST_STREAK_ACHIEVEMENT_DEF, c);
    }
    const def = ACHIEVEMENT_DEFS.find((d) => d.id === id);
    if (!def) throw new Error(`Unknown achievement id: ${id}`);
    return computeAchievement(def, c);
  });
}

export interface AchievementsInput {
  jobs: Job[];
  pointEvents: PointEvent[];
  stories: Story[];
}

export function calendarDayKeyForApplication(job: Job): string | null {
  const raw = (job.dateApplied?.trim() || job.createdAt || '').trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const t = new Date(raw);
  if (Number.isNaN(t.getTime())) return null;
  const y = t.getFullYear();
  const mo = String(t.getMonth() + 1).padStart(2, '0');
  const d = String(t.getDate()).padStart(2, '0');
  return `${y}-${mo}-${d}`;
}

/** Max number of jobs attributed to the same local calendar day (date_applied, else created_at). */
export function maxApplicationsInOneDay(jobs: Job[]): number {
  const byDay = new Map<string, number>();
  for (const j of jobs) {
    const k = calendarDayKeyForApplication(j);
    if (!k) continue;
    byDay.set(k, (byDay.get(k) ?? 0) + 1);
  }
  let max = 0;
  for (const n of byDay.values()) max = Math.max(max, n);
  return max;
}

export function computeAllAchievements({ jobs, pointEvents, stories }: AchievementsInput): ComputedAchievement[] {
  const countByType = (type: string) =>
    pointEvents.filter((e) => e.eventType === type).length;

  // follow_up_sent is not deduplicated — each event = one follow-up sent
  // Others use deduplicated point events as the canonical "reached this milestone" count

  return ACHIEVEMENT_DEFS.map((def) => {
    let count = 0;
    switch (def.id) {
      case 'jobs_applied':       count = jobs.length; break;
      case 'max_apps_one_day':   count = maxApplicationsInOneDay(jobs); break;
      case 'recruiter_screens':  count = countByType('status_recruiter_screen'); break;
      case 'interviews':         count = countByType('status_interviewing'); break;
      case 'offers':             count = countByType('status_offer'); break;
      case 'follow_ups':         count = countByType('follow_up_sent'); break;
      case 'resilience':          count = jobs.filter((j) => j.status === 'rejected').length; break;
      case 'prep_kits':          count = countByType('interview_prep_generated'); break;
      case 'star_stories':       count = stories.length; break;
    }
    return computeAchievement(def, count);
  });
}
