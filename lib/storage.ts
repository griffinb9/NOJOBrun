import { Job, Story, AppSettings } from './types';

const KEYS = {
  jobs: 'nojob_jobs',
  stories: 'nojob_stories',
  settings: 'nojob_settings',
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
};
