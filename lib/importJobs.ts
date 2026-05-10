import type { Job, JobStatus } from './types';
import { db } from './db';
import { compareAppliedByDateDesc } from './kanbanOrder';
import { now } from './utils';

export type FieldKey =
  | 'company'
  | 'role'
  | 'location'
  | 'salary'
  | 'status'
  | 'job_url'
  | 'notes'
  | 'date_applied'
  | 'job_description';

export const FIELD_LABELS: Record<FieldKey, string> = {
  company:         'Company',
  role:            'Role / Job Title',
  location:        'Location',
  salary:          'Salary',
  status:          'Status',
  job_url:         'Job URL',
  notes:           'Notes',
  date_applied:    'Application Date',
  job_description: 'Job Description',
};

export const REQUIRED_FIELDS: FieldKey[] = ['company', 'role'];

export const ALL_FIELDS: FieldKey[] = [
  'company', 'role', 'location', 'salary', 'status',
  'job_url', 'notes', 'date_applied', 'job_description',
];

const HINTS: Record<FieldKey, string[]> = {
  company:         ['company', 'employer', 'organization', 'org', 'company name', 'firm'],
  role:            ['role', 'title', 'job title', 'position', 'job role'],
  location:        ['location', 'city', 'office', 'place', 'remote', 'site'],
  salary:          ['salary', 'pay', 'compensation', 'comp', 'range', 'wage', 'rate'],
  status:          ['status', 'stage', 'application status', 'state'],
  job_url:         ['link', 'url', 'job link', 'posting', 'job url', 'application link', 'apply link'],
  notes:           ['notes', 'comments', 'comment', 'note', 'memo'],
  date_applied:    [
    'application date', 'applied date', 'date applied',
    'applied on', 'submission date', 'date',
  ],
  job_description: ['description', 'job description', 'jd', 'desc', 'details', 'requirements'],
};

export function autoDetectMapping(headers: string[]): Record<FieldKey, string | null> {
  const result = {} as Record<FieldKey, string | null>;
  const used = new Set<string>();

  for (const field of ALL_FIELDS) {
    result[field] = null;
    const lower = headers.map((h) => h.toLowerCase().trim());

    // Exact match first
    for (const hint of HINTS[field]) {
      const idx = lower.findIndex((h) => h === hint);
      if (idx !== -1 && !used.has(headers[idx])) {
        result[field] = headers[idx];
        used.add(headers[idx]);
        break;
      }
    }

    // Substring match fallback
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
  const s = raw.trim();

  // YYYY-MM-DD — already ISO, return as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // MM/DD/YYYY or M/D/YYYY — explicit to avoid locale ambiguity
  const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) {
    const [, m, d, y] = mdy;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Fallback: let the runtime parse it ("May 10, 2026", etc.)
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];

  return null;
}

/**
 * After a batch import, assigns Applied column sort_order.
 *
 * Auto mode: full column sorted by application date desc (fallback createdAt), invalid dates last.
 * Manual mode: imported Applied rows (by id) are prepended in date desc, existing rows keep order below.
 */
export async function sortAppliedColumnAfterImport(importedIds: string[]): Promise<void> {
  const profile = await db.getProfile();
  const manual = profile?.appliedManualSort ?? false;
  const imported = new Set(importedIds);

  const allJobs = await db.getJobs();
  const applied = allJobs.filter((j: Job) => j.status === 'applied');
  if (applied.length === 0) return;

  const ts = now();
  const toSave: Job[] = [];

  if (!manual) {
    const sorted = [...applied].sort(compareAppliedByDateDesc);
    sorted.forEach((j, i) => {
      if (j.sortOrder !== i) toSave.push({ ...j, sortOrder: i, updatedAt: ts });
    });
  } else {
    const newlyImported = applied.filter((j) => imported.has(j.id));
    const existing = applied.filter((j) => !imported.has(j.id));
    newlyImported.sort(compareAppliedByDateDesc);
    existing.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    const merged = [...newlyImported, ...existing];
    merged.forEach((j, i) => {
      if (j.sortOrder !== i) toSave.push({ ...j, sortOrder: i, updatedAt: ts });
    });
  }

  if (toSave.length > 0) await db.saveJobs(toSave);
}
