export type JobStatus = 'applied' | 'interviewing' | 'offer' | 'rejected' | 'ghosted';

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface Job {
  id: string;
  company: string;
  role: string;
  location?: string;
  salary?: string;
  status: JobStatus;
  dateApplied?: string;
  interviewDates?: string[];
  jobUrl?: string;
  jobDescription?: string;
  notes?: string;
  contactName?: string;
  contactEmail?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Story {
  id: string;
  title: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  anthropicApiKey?: string;
}

export const KANBAN_COLUMNS: { id: JobStatus; label: string; color: string }[] = [
  { id: 'applied', label: 'Applied', color: 'blue' },
  { id: 'interviewing', label: 'Interviewing', color: 'violet' },
  { id: 'offer', label: 'Offer', color: 'green' },
  { id: 'rejected', label: 'Rejected', color: 'red' },
  { id: 'ghosted', label: 'Ghosted', color: 'stone' },
];

export const STATUS_COLORS: Record<JobStatus, string> = {
  applied: 'bg-blue-100 text-blue-700 border-blue-200',
  interviewing: 'bg-violet-100 text-violet-700 border-violet-200',
  offer: 'bg-green-100 text-green-700 border-green-200',
  rejected: 'bg-red-100 text-red-600 border-red-200',
  ghosted: 'bg-stone-100 text-stone-500 border-stone-200',
};

export const STATUS_BORDER: Record<JobStatus, string> = {
  applied: 'border-l-blue-400',
  interviewing: 'border-l-violet-400',
  offer: 'border-l-green-400',
  rejected: 'border-l-red-400',
  ghosted: 'border-l-stone-300',
};

// ─── Points & Rank System ─────────────────────────────────────────────────────

export type PointEventType =
  | 'application_added'
  | 'follow_up_sent'
  | 'status_interviewing'
  | 'status_offer'
  | 'status_rejected'
  | 'interview_prep_generated'
  | 'notes_added';

export const POINT_VALUES: Record<PointEventType, number> = {
  application_added: 5,
  follow_up_sent: 5,
  status_interviewing: 25,
  status_offer: 100,
  status_rejected: 2,
  interview_prep_generated: 10,
  notes_added: 3,
};

export const POINT_DESCRIPTIONS: Record<PointEventType, string> = {
  application_added: 'Added a job application',
  follow_up_sent: 'Sent a follow-up email',
  status_interviewing: 'Interview scheduled',
  status_offer: 'Offer received',
  status_rejected: 'Logged a rejection',
  interview_prep_generated: 'Generated interview prep',
  notes_added: 'Added notes to an application',
};

// Events that should only be awarded once per application
export const DEDUPLICATED_EVENT_TYPES: PointEventType[] = [
  'application_added',
  'status_interviewing',
  'status_offer',
  'status_rejected',
  'interview_prep_generated',
  'notes_added',
];

export interface PointEvent {
  id: string;
  applicationId?: string;
  eventType: PointEventType;
  points: number;
  description: string;
  createdAt: string;
}

export interface UserProgress {
  totalPoints: number;
  currentRank: string;
  weeklyPoints: number;
  weeklyGoal: number;
  weekStartDate: string;
  lastActivityDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface RankTier {
  name: string;
  description: string;
  minPoints: number;
  maxPoints: number | null;
  accentColor: string;
  badgeBg: string;
  badgeText: string;
  barColor: string;
}

export const RANK_TIERS: RankTier[] = [
  {
    name: 'Underdog',
    description: 'Getting started and putting yourself out there',
    minPoints: 0,
    maxPoints: 50,
    accentColor: 'text-stone-600',
    badgeBg: 'bg-stone-100',
    badgeText: 'text-stone-600',
    barColor: 'bg-stone-400',
  },
  {
    name: 'On the Rise',
    description: 'Building momentum and consistency',
    minPoints: 51,
    maxPoints: 150,
    accentColor: 'text-blue-600',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-600',
    barColor: 'bg-blue-500',
  },
  {
    name: 'Locked In',
    description: 'Focused, intentional, and applying strategically',
    minPoints: 151,
    maxPoints: 300,
    accentColor: 'text-violet-600',
    badgeBg: 'bg-violet-50',
    badgeText: 'text-violet-600',
    barColor: 'bg-violet-500',
  },
  {
    name: 'Interview Pro',
    description: 'Confident and prepared in interviews',
    minPoints: 301,
    maxPoints: 600,
    accentColor: 'text-amber-600',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-600',
    barColor: 'bg-amber-500',
  },
  {
    name: 'Offer Season',
    description: 'Turning interviews into offers',
    minPoints: 601,
    maxPoints: null,
    accentColor: 'text-green-600',
    badgeBg: 'bg-green-50',
    badgeText: 'text-green-600',
    barColor: 'bg-green-500',
  },
];
