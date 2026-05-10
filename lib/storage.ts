import { Job, Story, AppSettings, PointEvent, UserProgress, UserProfile } from './types';

const KEYS = {
  jobs: 'nojob_jobs',
  stories: 'nojob_stories',
  settings: 'nojob_settings',
  pointEvents: 'nojob_point_events',
  userProgress: 'nojob_user_progress',
  userProfile: 'nojob_user_profile',
};

const DEFAULT_PROGRESS: UserProgress = {
  totalPoints: 0,
  currentRank: 'Underdog',
  weeklyPoints: 0,
  weeklyGoal: 50,
  weekStartDate: new Date().toISOString(),
  lastActivityDate: new Date().toISOString(),
  currentStreak: 0,
  longestStreak: 0,
  lastStreakDate: undefined,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function safeGet<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function safeGetNullable<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function safeSet<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

export const storage = {
  // Jobs
  getJobs: (): Job[] => safeGet<Job[]>(KEYS.jobs, []),
  saveJobs: (jobs: Job[]) => safeSet(KEYS.jobs, jobs),
  addJob: (job: Job) => {
    const jobs = storage.getJobs();
    storage.saveJobs([...jobs, job]);
  },
  updateJob: (updated: Job) => {
    const jobs = storage.getJobs().map((j) => (j.id === updated.id ? updated : j));
    storage.saveJobs(jobs);
  },
  deleteJob: (id: string) => {
    storage.saveJobs(storage.getJobs().filter((j) => j.id !== id));
  },
  getJob: (id: string): Job | undefined => storage.getJobs().find((j) => j.id === id),

  // Stories
  getStories: (): Story[] => safeGet<Story[]>(KEYS.stories, []),
  saveStories: (stories: Story[]) => safeSet(KEYS.stories, stories),
  addStory: (story: Story) => {
    storage.saveStories([...storage.getStories(), story]);
  },
  updateStory: (updated: Story) => {
    const stories = storage.getStories().map((s) => (s.id === updated.id ? updated : s));
    storage.saveStories(stories);
  },
  deleteStory: (id: string) => {
    storage.saveStories(storage.getStories().filter((s) => s.id !== id));
  },

  // Settings
  getSettings: (): AppSettings => safeGet<AppSettings>(KEYS.settings, {}),
  saveSettings: (settings: AppSettings) => safeSet(KEYS.settings, settings),

  // Point events
  getPointEvents: (): PointEvent[] => safeGet<PointEvent[]>(KEYS.pointEvents, []),
  savePointEvents: (events: PointEvent[]) => safeSet(KEYS.pointEvents, events),
  addPointEvent: (event: PointEvent) => {
    storage.savePointEvents([...storage.getPointEvents(), event]);
  },

  // User progress (auto-creates default if missing)
  getUserProgress: (): UserProgress => safeGet<UserProgress>(KEYS.userProgress, DEFAULT_PROGRESS),
  saveUserProgress: (progress: UserProgress) => safeSet(KEYS.userProgress, progress),

  // User profile (null = not set up yet → triggers onboarding)
  getUserProfile: (): UserProfile | null => safeGetNullable<UserProfile>(KEYS.userProfile),
  saveUserProfile: (profile: UserProfile) => safeSet(KEYS.userProfile, profile),
};
