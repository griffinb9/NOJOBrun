import type { JobStatus } from './types';

export type FieldKey =
  | 'company'
  | 'role'
  | 'location'
  | 'salary'
  | 'status'
  | 'job_url'
  | 'notes'
  | 'interview_date'
  | 'job_description';

export const FIELD_LABELS: Record<FieldKey, string> = {
  company: 'Company',
  role: 'Role / Job Title',
  location: 'Location',
  salary: 'Salary',
  status: 'Status',
  job_url: 'Job URL',
  notes: 'Notes',
  interview_date: 'Interview Date',
  job_description: 'Job Description',
};

export const REQUIRED_FIELDS: FieldKey[] = ['company', 'role'];

export const ALL_FIELDS: FieldKey[] = [
  'company', 'role', 'location', 'salary', 'status',
  'job_url', 'notes', 'interview_date', 'job_description',
];

const HINTS: Record<FieldKey, string[]> = {
  company:        ['company', 'employer', 'organization', 'org', 'company name', 'firm'],
  role:           ['role', 'title', 'job title', 'position', 'job role'],
  location:       ['location', 'city', 'office', 'place', 'remote', 'site'],
  salary:         ['salary', 'pay', 'compensation', 'comp', 'range', 'wage', 'rate'],
  status:         ['status', 'stage', 'application status', 'state'],
  job_url:        ['link', 'url', 'job link', 'posting', 'job url', 'application link', 'apply link'],
  notes:          ['notes', 'comments', 'comment', 'note', 'memo'],
  interview_date: ['interview date', 'interview dates', 'date', 'meeting date', 'scheduled date'],
  job_description:['description', 'job description', 'jd', 'desc', 'details', 'requirements'],
};

export function autoDetectMapping(headers: string[]): Record<FieldKey, string | null> {
  const result = {} as Record<FieldKey, string | null>;
  const used = new Set<string>();

  for (const field of ALL_FIELDS) {
    result[field] = null;
    const lower = headers.map((h) => h.toLowerCase().trim());

    for (const hint of HINTS[field]) {
      const idx = lower.findIndex((h) => h === hint);
      if (idx !== -1 && !used.has(headers[idx])) {
        result[field] = headers[idx];
        used.add(headers[idx]);
        break;
      }
    }

    if (result[field] === null) {
      for (const hint of HINTS[field]) {
        const idx = lower.findIndex((h) => h.includes(hint) || hint.includes(h));
        if (idx !== -1 && !used.has(headers[idx])) {
          result[field] = headers[idx];
          used.add(headers[idx]);
          break;
        }
      }
    }
  }

  return result;
}

export function normalizeStatus(raw: string): JobStatus {
  const s = raw.toLowerCase().trim();
  if (!s) return 'applied';
  if (/recruiter|phone.?screen|screening/.test(s)) return 'recruiter_screen';
  if (/interview/.test(s)) return 'interviewing';
  if (/reject|declin|deni/.test(s)) return 'rejected';
  if (/offer/.test(s)) return 'offer';
  if (/ghost|no.?response/.test(s)) return 'ghosted';
  return 'applied';
}

export function parseImportDate(raw: string): string | null {
  if (!raw?.trim()) return null;
  const d = new Date(raw.trim());
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  return null;
}
