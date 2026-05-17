import type { Job, JobStatus } from '@/lib/types';
import { daysSince } from '@/lib/utils';

export type ApplicationGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export type InterviewSelfNotes = {
  wentWell?: string;
  couldImprove?: string;
};

const PIPELINE_STATUSES: ReadonlySet<JobStatus> = new Set([
  'recruiter_screen',
  'interviewing',
  'offer',
]);

export function parseInterviewSelfNotes(raw?: string | null): InterviewSelfNotes {
  if (!raw?.trim()) return {};
  try {
    const parsed = JSON.parse(raw) as InterviewSelfNotes;
    if (parsed && typeof parsed === 'object') return parsed;
  } catch {
    return { wentWell: raw };
  }
  return {};
}

export function serializeInterviewSelfNotes(notes: InterviewSelfNotes): string | undefined {
  const wentWell = notes.wentWell?.trim();
  const couldImprove = notes.couldImprove?.trim();
  if (!wentWell && !couldImprove) return undefined;
  return JSON.stringify({
    ...(wentWell ? { wentWell } : {}),
    ...(couldImprove ? { couldImprove } : {}),
  });
}

export function interviewSelfScoreLabel(score: number): string {
  const labels: Record<number, string> = {
    1: 'Poor',
    2: 'Below Average',
    3: 'Okay',
    4: 'Good',
    5: 'Great',
  };
  return labels[score] ?? '—';
}

/** True if the application ever reached screen, interview, or offer. */
export function reachedEmployerPipeline(job: Job): boolean {
  return job.hasResponse === true || PIPELINE_STATUSES.has(job.status);
}

function progressBonus(job: Job): number {
  if (job.status === 'ghosted') return -20;
  if (job.status === 'offer') return 40;
  if (job.status === 'interviewing') return 25;
  if (job.status === 'recruiter_screen') return 15;
  if (job.status === 'rejected' && reachedEmployerPipeline(job)) {
    if ((job.interviewDates?.length ?? 0) > 0) return 25;
    return 15;
  }
  return 0;
}

function timelineBonus(job: Job): number {
  if (!job.dateApplied) return 0;
  const days = daysSince(job.dateApplied);
  if (days <= 7) return 10;
  if (days <= 14) return 5;
  if (days <= 20) return 0;
  if (job.status === 'applied') return -20;
  return 0;
}

function followUpBonus(job: Job): number {
  if (job.followUpSent) return 10;
  if (!job.dateApplied) return 0;
  const days = daysSince(job.dateApplied);
  if (days >= 5) return -10;
  return 0;
}

function selfScoreBonus(score?: number | null): number {
  if (score == null) return 0;
  const map: Record<number, number> = { 1: -10, 2: -5, 3: 5, 4: 10, 5: 15 };
  return map[score] ?? 0;
}

export function scoreToGrade(score: number): ApplicationGrade {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

export type GradeBreakdown = {
  score: number;
  grade: ApplicationGrade;
  timeline: number;
  followUp: number;
  progress: number;
  selfScore: number;
};

export function calculateApplicationGrade(job: Job): GradeBreakdown {
  const timeline = timelineBonus(job);
  const followUp = followUpBonus(job);
  const progress = progressBonus(job);
  const selfScore = selfScoreBonus(job.interviewSelfScore);
  const score = 100 + timeline + followUp + progress + selfScore;

  return {
    score,
    grade: scoreToGrade(score),
    timeline,
    followUp,
    progress,
    selfScore,
  };
}

const GRADE_HEADLINES: Record<ApplicationGrade, string> = {
  A: 'Excellent application health',
  B: 'Strong application',
  C: 'Solid, with room to improve',
  D: 'Needs attention',
  F: 'At risk — take action soon',
};

export function explainApplicationGrade(job: Job, breakdown?: GradeBreakdown): string {
  const { grade, score } = breakdown ?? calculateApplicationGrade(job);
  const parts: string[] = [];

  if (job.followUpSent) parts.push('you followed up');
  else if (job.dateApplied && daysSince(job.dateApplied) >= 5) parts.push('no follow-up yet');

  if (job.status === 'offer') parts.push('you have an offer');
  else if (job.status === 'interviewing') parts.push('you reached interviewing');
  else if (job.status === 'recruiter_screen') parts.push('you reached a screen');
  else if (job.status === 'rejected' && reachedEmployerPipeline(job)) {
    parts.push('you got a response (even though it ended in rejection)');
  } else if (job.status === 'ghosted') parts.push('this role was ghosted');
  else if (job.status === 'applied' && job.dateApplied && daysSince(job.dateApplied) > 20) {
    parts.push('still waiting on a response');
  }

  if (job.interviewSelfScore != null) {
    parts.push(`self-score: ${interviewSelfScoreLabel(job.interviewSelfScore)}`);
  }

  const detail = parts.length > 0 ? parts.join(', ') : 'based on timeline and activity';
  return `${grade} — ${GRADE_HEADLINES[grade]}. ${detail.charAt(0).toUpperCase()}${detail.slice(1)}. (${Math.round(score)} pts)`;
}

export function applyApplicationGrade(job: Job, at?: string): Job {
  const breakdown = calculateApplicationGrade(job);
  return {
    ...job,
    applicationGrade: breakdown.grade,
    applicationGradeUpdatedAt: at ?? new Date().toISOString(),
  };
}

export const GRADE_BADGE_CLASSES: Record<ApplicationGrade, string> = {
  A: 'bg-emerald-100 text-emerald-800 border-emerald-300/80 ring-emerald-200/50',
  B: 'bg-blue-100 text-blue-800 border-blue-300/80 ring-blue-200/50',
  C: 'bg-amber-100 text-amber-900 border-amber-300/80 ring-amber-200/50',
  D: 'bg-orange-100 text-orange-900 border-orange-300/80 ring-orange-200/50',
  F: 'bg-red-100 text-red-800 border-red-300/80 ring-red-200/50',
};
