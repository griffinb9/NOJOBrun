import type { JobStatus } from './types';

const STORAGE_KEY = 'nojob.jobForm.addDraft.v1';
/** Drafts older than this are discarded on read. */
export const JOB_ADD_DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

export type JobAddDraftFormV1 = {
  company: string;
  role: string;
  location: string;
  salary: string;
  status: JobStatus;
  dateApplied: string;
  interviewDates: string[];
  jobUrl: string;
  jobDescription: string;
  notes: string;
  contactName: string;
  contactEmail: string;
};

export type JobAddDraftV1 = {
  v: 1;
  updatedAt: number;
  modalOpen: boolean;
  initialStatus: JobStatus;
  form: JobAddDraftFormV1;
  interviewInput: string;
};

function safeParse(raw: string | null): JobAddDraftV1 | null {
  if (!raw) return null;
  try {
    const d = JSON.parse(raw) as JobAddDraftV1;
    if (d.v !== 1 || !d.form) return null;
    return d;
  } catch {
    return null;
  }
}

export function readJobAddDraft(): JobAddDraftV1 | null {
  if (typeof sessionStorage === 'undefined') return null;
  const d = safeParse(sessionStorage.getItem(STORAGE_KEY));
  if (!d) return null;
  if (Date.now() - d.updatedAt > JOB_ADD_DRAFT_TTL_MS) {
    sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
  return d;
}

export function writeJobAddDraftFull(d: {
  modalOpen: boolean;
  initialStatus: JobStatus;
  form: JobAddDraftFormV1;
  interviewInput: string;
}): void {
  if (typeof sessionStorage === 'undefined') return;
  const next: JobAddDraftV1 = {
    v: 1,
    updatedAt: Date.now(),
    modalOpen: d.modalOpen,
    initialStatus: d.initialStatus,
    form: d.form,
    interviewInput: d.interviewInput,
  };
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function clearJobAddDraft(): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.removeItem(STORAGE_KEY);
}

export function baselineAddForm(status: JobStatus, dateApplied: string): JobAddDraftFormV1 {
  return {
    company: '',
    role: '',
    location: '',
    salary: '',
    status,
    dateApplied,
    interviewDates: [],
    jobUrl: '',
    jobDescription: '',
    notes: '',
    contactName: '',
    contactEmail: '',
  };
}

export function isAddJobFormDirty(
  form: JobAddDraftFormV1,
  interviewInput: string,
  baselineStatus: JobStatus,
  baselineDateApplied: string,
): boolean {
  if (interviewInput.trim()) return true;
  if ((form.interviewDates?.length ?? 0) > 0) return true;
  if (form.company.trim() || form.role.trim()) return true;
  if (form.location.trim() || form.salary.trim()) return true;
  if (form.jobUrl.trim() || form.jobDescription.trim() || form.notes.trim()) return true;
  if (form.contactName.trim() || form.contactEmail.trim()) return true;
  if (form.status !== baselineStatus) return true;
  if ((form.dateApplied ?? '').trim() !== (baselineDateApplied ?? '').trim()) return true;
  return false;
}
