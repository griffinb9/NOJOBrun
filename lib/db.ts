/**
 * Async data layer backed by Supabase.
 * Replaces the synchronous lib/storage.ts for all user-specific data.
 * AppSettings (Anthropic API key) remain in localStorage via lib/storage.ts.
 */

import { supabase } from './supabase';
import { Job, JobStatus, Story, PointEvent, UserProgress, UserProfile } from './types';
import { computeJobStreak } from './job-streak';
import { now } from './utils';

// ── Row shapes (snake_case from Postgres) ────────────────────────────────────

interface ProfileRow {
  id: string; full_name: string; email: string;
  resume_text: string | null;
  resume_file_name: string | null;
  resume_updated_at: string | null;
  created_at: string; updated_at: string;
}

interface ApplicationRow {
  id: string; user_id: string; company: string; role: string;
  location: string | null; salary: string | null; status: string;
  date_applied: string | null; interview_dates: string[];
  job_url: string | null; job_description: string | null;
  notes: string | null; contact_name: string | null; contact_email: string | null;
  sort_order: number | null; created_at: string; updated_at: string;
}

interface StoryRow {
  id: string; user_id: string; title: string;
  situation: string; task: string; action: string; result: string;
  tags: string[]; created_at: string; updated_at: string;
}

interface PointEventRow {
  id: string; user_id: string; application_id: string | null;
  event_type: string; points: number; description: string; created_at: string;
}

interface ProgressRow {
  user_id: string; total_points: number; current_rank: string;
  weekly_points: number; weekly_goal: number;
  week_start_date: string; last_activity_date: string;
  current_streak: number | null;
  longest_streak: number | null;
  last_streak_date: string | null;
  created_at: string; updated_at: string;
}

// ── Mappers ──────────────────────────────────────────────────────────────────

function rowToProfile(r: ProfileRow): UserProfile {
  return {
    id: r.id, fullName: r.full_name, email: r.email,
    resumeText: r.resume_text ?? undefined,
    resumeFileName: r.resume_file_name ?? undefined,
    resumeUpdatedAt: r.resume_updated_at ?? undefined,
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

function profileToRow(p: UserProfile): ProfileRow {
  return {
    id: p.id, full_name: p.fullName, email: p.email,
    resume_text: p.resumeText ?? null,
    resume_file_name: p.resumeFileName ?? null,
    resume_updated_at: p.resumeUpdatedAt ?? null,
    created_at: p.createdAt, updated_at: p.updatedAt,
  };
}

/** Upsert payload without resume_* columns — for DBs that have not run the resume migration yet. */
function profileToMinimalRow(p: UserProfile): Pick<ProfileRow, 'id' | 'full_name' | 'email' | 'created_at' | 'updated_at'> {
  return {
    id: p.id,
    full_name: p.fullName,
    email: p.email,
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  };
}

function isMissingResumeColumnError(message: string): boolean {
  const m = message.toLowerCase();
  const names =
    m.includes('resume_file_name')
    || m.includes('resume_text')
    || m.includes('resume_updated_at');
  const wording = m.includes('could not find') || m.includes('schema cache') || m.includes('column');
  return names && wording;
}

export function formatProfileSaveError(message: string): string {
  if (isMissingResumeColumnError(message)) {
    return (
      'Your Supabase project is missing resume columns on user_profiles. '
      + 'Open the SQL editor and run the ALTER TABLE statements for resume_text, resume_file_name, '
      + 'and resume_updated_at from supabase/migrations.sql, then try again.'
    );
  }
  return message;
}

export type SaveProfileOptions = {
  /**
   * If the DB has no resume_* columns, retry upsert with only account fields so sign-up and settings keep working.
   * Never use when saving resume text — the user must run the migration first.
   */
  omitResumeOnSchemaError?: boolean;
};

function rowToJob(r: ApplicationRow): Job {
  return {
    id: r.id, company: r.company, role: r.role,
    location: r.location ?? undefined, salary: r.salary ?? undefined,
    status: r.status as JobStatus,
    dateApplied: r.date_applied ?? undefined,
    interviewDates: r.interview_dates ?? [],
    jobUrl: r.job_url ?? undefined,
    jobDescription: r.job_description ?? undefined,
    notes: r.notes ?? undefined,
    contactName: r.contact_name ?? undefined,
    contactEmail: r.contact_email ?? undefined,
    sortOrder: r.sort_order ?? undefined,
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

function jobToRow(j: Job, userId: string): ApplicationRow {
  return {
    id: j.id, user_id: userId, company: j.company, role: j.role,
    location: j.location ?? null, salary: j.salary ?? null,
    status: j.status,
    date_applied: j.dateApplied ?? null,
    interview_dates: j.interviewDates ?? [],
    job_url: j.jobUrl ?? null,
    job_description: j.jobDescription ?? null,
    notes: j.notes ?? null,
    contact_name: j.contactName ?? null,
    contact_email: j.contactEmail ?? null,
    sort_order: j.sortOrder ?? null,
    created_at: j.createdAt, updated_at: j.updatedAt,
  };
}

function rowToStory(r: StoryRow): Story {
  return {
    id: r.id, title: r.title, situation: r.situation,
    task: r.task, action: r.action, result: r.result,
    tags: r.tags ?? [], createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

function storyToRow(s: Story, userId: string): StoryRow {
  return {
    id: s.id, user_id: userId, title: s.title,
    situation: s.situation, task: s.task, action: s.action, result: s.result,
    tags: s.tags ?? [], created_at: s.createdAt, updated_at: s.updatedAt,
  };
}

function rowToPointEvent(r: PointEventRow): PointEvent {
  return {
    id: r.id, applicationId: r.application_id ?? undefined,
    eventType: r.event_type as PointEvent['eventType'],
    points: r.points, description: r.description,
    createdAt: r.created_at,
  };
}

function pointEventToRow(e: PointEvent, userId: string): PointEventRow {
  return {
    id: e.id, user_id: userId,
    application_id: e.applicationId ?? null,
    event_type: e.eventType, points: e.points,
    description: e.description, created_at: e.createdAt,
  };
}

function rowToProgress(r: ProgressRow): UserProgress {
  return {
    totalPoints: r.total_points, currentRank: r.current_rank,
    weeklyPoints: r.weekly_points, weeklyGoal: r.weekly_goal,
    weekStartDate: r.week_start_date, lastActivityDate: r.last_activity_date,
    currentStreak: r.current_streak ?? 0,
    longestStreak: r.longest_streak ?? 0,
    lastStreakDate: r.last_streak_date ?? undefined,
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

const DEFAULT_PROGRESS: UserProgress = {
  totalPoints: 0, currentRank: 'Underdog',
  weeklyPoints: 0, weeklyGoal: 50,
  weekStartDate: now(), lastActivityDate: now(),
  currentStreak: 0, longestStreak: 0, lastStreakDate: undefined,
  createdAt: now(), updatedAt: now(),
};

// ── Helpers ──────────────────────────────────────────────────────────────────

async function uid(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

// ── Public DB API ────────────────────────────────────────────────────────────

export const db = {

  // ── Profile ────────────────────────────────────────────────────────────────

  async getProfile(): Promise<UserProfile | null> {
    const userId = await uid();
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();
    // PGRST116 = "no rows found" — expected when profile doesn't exist yet
    if (error && error.code !== 'PGRST116') return null;
    return data ? rowToProfile(data as ProfileRow) : null;
  },

  async saveProfile(profile: UserProfile, options?: SaveProfileOptions): Promise<void> {
    const { error } = await supabase
      .from('user_profiles')
      .upsert(profileToRow(profile), { onConflict: 'id' });
    if (!error) return;

    const msg = error.message ?? '';
    if (options?.omitResumeOnSchemaError && isMissingResumeColumnError(msg)) {
      const { error: err2 } = await supabase
        .from('user_profiles')
        .upsert(profileToMinimalRow(profile), { onConflict: 'id' });
      if (err2) throw new Error(formatProfileSaveError(err2.message ?? ''));
      return;
    }

    throw new Error(formatProfileSaveError(msg));
  },

  // ── Jobs ───────────────────────────────────────────────────────────────────

  async getJobs(): Promise<Job[]> {
    const userId = await uid();
    const { data } = await supabase
      .from('applications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    return (data ?? []).map((r) => rowToJob(r as ApplicationRow));
  },

  async saveJobs(jobs: Job[]): Promise<void> {
    if (jobs.length === 0) return;
    const userId = await uid();
    await supabase
      .from('applications')
      .upsert(jobs.map((j) => jobToRow(j, userId)), { onConflict: 'id' });
    const fresh = await db.getJobs();
    await db.syncJobStreakFromJobs(fresh);
  },

  async addJob(job: Job): Promise<void> {
    const userId = await uid();
    await supabase.from('applications').insert(jobToRow(job, userId));
    const fresh = await db.getJobs();
    await db.syncJobStreakFromJobs(fresh);
  },

  async updateJob(job: Job): Promise<void> {
    const userId = await uid();
    await supabase
      .from('applications')
      .update(jobToRow(job, userId))
      .eq('id', job.id);
    const fresh = await db.getJobs();
    await db.syncJobStreakFromJobs(fresh);
  },

  async deleteJob(id: string): Promise<void> {
    await supabase.from('applications').delete().eq('id', id);
    const fresh = await db.getJobs();
    await db.syncJobStreakFromJobs(fresh);
  },

  async getJob(id: string): Promise<Job | null> {
    const { data } = await supabase
      .from('applications')
      .select('*')
      .eq('id', id)
      .single();
    return data ? rowToJob(data as ApplicationRow) : null;
  },

  // ── Stories ────────────────────────────────────────────────────────────────

  async getStories(): Promise<Story[]> {
    const userId = await uid();
    const { data } = await supabase
      .from('stories')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    return (data ?? []).map((r) => rowToStory(r as StoryRow));
  },

  async addStory(story: Story): Promise<void> {
    const userId = await uid();
    await supabase.from('stories').insert(storyToRow(story, userId));
  },

  async updateStory(story: Story): Promise<void> {
    const userId = await uid();
    await supabase
      .from('stories')
      .update(storyToRow(story, userId))
      .eq('id', story.id);
  },

  async deleteStory(id: string): Promise<void> {
    await supabase.from('stories').delete().eq('id', id);
  },

  // ── Point Events ───────────────────────────────────────────────────────────

  async getPointEvents(): Promise<PointEvent[]> {
    const userId = await uid();
    const { data } = await supabase
      .from('point_events')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    return (data ?? []).map((r) => rowToPointEvent(r as PointEventRow));
  },

  async addPointEvent(event: PointEvent): Promise<void> {
    const userId = await uid();
    await supabase.from('point_events').insert(pointEventToRow(event, userId));
  },

  // ── User Progress ──────────────────────────────────────────────────────────

  async getUserProgress(): Promise<UserProgress> {
    const userId = await uid();
    const { data } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .single();
    return data ? rowToProgress(data as ProgressRow) : { ...DEFAULT_PROGRESS };
  },

  /**
   * Recompute apply streak from tracker data and persist to user_progress when values change.
   */
  async syncJobStreakFromJobs(jobs: Job[], progressHint?: UserProgress): Promise<UserProgress> {
    const progress = progressHint ?? await db.getUserProgress();
    const s = computeJobStreak(jobs);
    const next: UserProgress = {
      ...progress,
      currentStreak: s.currentStreak,
      longestStreak: s.longestStreak,
      lastStreakDate: s.lastStreakDate ?? undefined,
      updatedAt: now(),
    };
    const same =
      (progress.currentStreak ?? 0) === s.currentStreak
      && (progress.longestStreak ?? 0) === s.longestStreak
      && (progress.lastStreakDate ?? null) === (s.lastStreakDate ?? null);
    if (!same) await db.saveUserProgress(next);
    return same ? progress : next;
  },

  async saveUserProgress(progress: UserProgress): Promise<void> {
    const userId = await uid();
    const ts = now();
    await supabase.from('user_progress').upsert({
      user_id: userId,
      total_points: progress.totalPoints,
      current_rank: progress.currentRank,
      weekly_points: progress.weeklyPoints,
      weekly_goal: progress.weeklyGoal,
      week_start_date: progress.weekStartDate,
      last_activity_date: progress.lastActivityDate,
      current_streak: progress.currentStreak ?? 0,
      longest_streak: progress.longestStreak ?? 0,
      last_streak_date: progress.lastStreakDate ?? null,
      created_at: progress.createdAt,
      updated_at: ts,
    }, { onConflict: 'user_id' });
  },

  async initProgress(): Promise<void> {
    const userId = await uid();
    const ts = now();
    // ignoreDuplicates: true → INSERT ... ON CONFLICT DO NOTHING
    // Safe to call multiple times — never resets earned points
    const { error } = await supabase.from('user_progress').upsert({
      user_id: userId,
      total_points: 0, current_rank: 'Underdog',
      weekly_points: 0, weekly_goal: 50,
      week_start_date: ts, last_activity_date: ts,
      current_streak: 0, longest_streak: 0, last_streak_date: null,
      created_at: ts, updated_at: ts,
    }, { onConflict: 'user_id', ignoreDuplicates: true });
    if (error) throw new Error(error.message);
  },
};
