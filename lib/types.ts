export type JobStatus = 'applied' | 'interviewing' | 'offer' | 'rejected' | 'ghosted';

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
