import { PointEvent, Story, Job } from './types';

export type TierName =
  | 'Bronze 1' | 'Bronze 2' | 'Bronze 3'
  | 'Silver 1' | 'Silver 2' | 'Silver 3'
  | 'Gold 1'   | 'Gold 2'   | 'Gold 3'
  | 'Platinum';

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
  'Platinum': { badge: 'bg-violet-100 text-violet-700 border-violet-200', bar: 'bg-violet-500', accent: 'text-violet-700', borderTop: 'border-t-violet-500', iconBg: 'bg-violet-100', iconColor: 'text-violet-600' },
};

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
  { name: 'Platinum', min: 500 },
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
  { name: 'Platinum', min: 50 },
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
  { name: 'Platinum', min: 50 },
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
  { name: 'Platinum', min: 15 },
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
  { name: 'Platinum', min: 150 },
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
  { name: 'Platinum', min: 50 },
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
  { name: 'Platinum', min: 21 },
];

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  {
    id: 'jobs_applied',
    name: 'Applications Sent',
    description: 'Every application is a step forward. Volume builds luck.',
    unit: 'application',
    tiers: TIERS_JOBS_APPLIED,
  },
  {
    id: 'recruiter_screens',
    name: 'Recruiter Screens',
    description: 'Getting past the initial filter is a real signal.',
    unit: 'recruiter screen',
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

function computeAchievement(def: AchievementDef, count: number): ComputedAchievement {
  const tiers = def.tiers;

  // Find the highest tier whose min <= count
  let currentIdx = 0;
  for (let i = tiers.length - 1; i >= 0; i--) {
    if (count >= tiers[i].min) { currentIdx = i; break; }
  }

  const currentTier = tiers[currentIdx];
  const nextTier = currentIdx < tiers.length - 1 ? tiers[currentIdx + 1] : null;

  let progressPercent = 100;
  let toNextTier: number | null = null;

  if (nextTier) {
    const rangeStart = currentTier.min;
    const rangeEnd = nextTier.min;
    progressPercent = Math.min(100, Math.round(((count - rangeStart) / (rangeEnd - rangeStart)) * 100));
    toNextTier = rangeEnd - count;
  }

  return { ...def, count, currentTier, nextTier, progressPercent, toNextTier };
}

export interface AchievementsInput {
  jobs: Job[];
  pointEvents: PointEvent[];
  stories: Story[];
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
      case 'recruiter_screens':  count = countByType('status_recruiter_screen'); break;
      case 'interviews':         count = countByType('status_interviewing'); break;
      case 'offers':             count = countByType('status_offer'); break;
      case 'follow_ups':         count = countByType('follow_up_sent'); break;
      case 'prep_kits':          count = countByType('interview_prep_generated'); break;
      case 'star_stories':       count = stories.length; break;
    }
    return computeAchievement(def, count);
  });
}
