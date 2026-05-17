'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X, Star } from 'lucide-react';
import { Job, JobStatus, KANBAN_COLUMNS } from '@/lib/types';
import { db } from '@/lib/db';
import { newId, now } from '@/lib/utils';
import { awardPoints } from '@/lib/points';
import { coerceLoadedSalaryForForm } from '@/lib/salaryRanges';
import SalaryRangeSelect from '@/components/jobs/SalaryRangeSelect';
import {
  clearJobAddDraft,
  isAddJobFormDirty,
  readJobAddDraft,
  writeJobAddDraftFull,
  type JobAddDraftFormV1,
} from '@/lib/jobFormDraftSession';
import { useModalScrollLock } from '@/lib/useModalScrollLock';
import {
  applyApplicationGrade,
  explainApplicationGrade,
  interviewSelfScoreLabel,
  serializeInterviewSelfNotes,
  type InterviewSelfNotes,
} from '@/lib/applicationGrade';
import ApplicationGradeBadge from '@/components/jobs/ApplicationGradeBadge';
import InterviewSelfScoreModal from '@/components/jobs/InterviewSelfScoreModal';

interface Props {
  open: boolean;
  onClose: () => void;
  job?: Job;
  initialStatus?: JobStatus;
  /** Add-job flow: persist draft in sessionStorage + confirm discard on close. */
  persistDraft?: boolean;
}

type JobFormState = Omit<Job, 'id' | 'createdAt' | 'updatedAt' | 'applicationGrade' | 'applicationGradeUpdatedAt'>;

const empty: JobFormState = {
  company: '',
  role: '',
  location: '',
  salary: '',
  status: 'applied',
  dateApplied: new Date().toISOString().split('T')[0],
  interviewDates: [],
  jobUrl: '',
  jobDescription: '',
  notes: '',
  contactName: '',
  contactEmail: '',
  followUpSent: false,
  followUpSentAt: undefined,
  interviewSelfScore: undefined,
  interviewSelfNotes: undefined,
  hasResponse: false,
};

function formToDraftShape(f: JobFormState): JobAddDraftFormV1 {

  return {
    company: f.company,
    role: f.role,
    location: f.location ?? '',
    salary: f.salary ?? '',
    status: f.status,
    dateApplied: f.dateApplied ?? '',
    interviewDates: [...(f.interviewDates ?? [])],
    jobUrl: f.jobUrl ?? '',
    jobDescription: f.jobDescription ?? '',
    notes: f.notes ?? '',
    contactName: f.contactName ?? '',
    contactEmail: f.contactEmail ?? '',
  };
}

function draftShapeToForm(d: JobAddDraftFormV1): JobFormState {
  return {
    ...empty,
    company: d.company,
    role: d.role,
    location: d.location,
    salary: d.salary,
    status: d.status,
    dateApplied: d.dateApplied,
    interviewDates: [...(d.interviewDates ?? [])],
    jobUrl: d.jobUrl,
    jobDescription: d.jobDescription,
    notes: d.notes,
    contactName: d.contactName,
    contactEmail: d.contactEmail,
  };
}

export default function JobFormModal({ open, onClose, job, initialStatus, persistDraft }: Props) {
  const [form, setForm] = useState({ ...empty });
  const [interviewInput, setInterviewInput] = useState('');
  const [saving, setSaving] = useState(false);
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const baselineStatusRef = useRef<JobStatus>('applied');
  const baselineDateRef = useRef<string>('');
  const prevOpenRef = useRef(false);

  const isAddJobFlow = Boolean(persistDraft && !job);
  useModalScrollLock(open && isAddJobFlow);

  const [selfScoreOpen, setSelfScoreOpen] = useState(false);

  const flushDraft = useCallback(
    (modalOpen: boolean, formArg: JobFormState, interviewInputArg: string, initStatus: JobStatus) => {
      if (!persistDraft || job) return;
      writeJobAddDraftFull({
        modalOpen,
        initialStatus: initStatus,
        form: formToDraftShape(formArg),
        interviewInput: interviewInputArg,
      });
    },
    [persistDraft, job],
  );

  useEffect(() => {
    if (!open) {
      prevOpenRef.current = false;
      return;
    }

    const justOpened = !prevOpenRef.current;
    prevOpenRef.current = true;
    if (!justOpened) return;

    if (job) {
      setForm({
        company: job.company,
        role: job.role,
        location: job.location ?? '',
        salary: coerceLoadedSalaryForForm(job.salary),
        status: job.status,
        dateApplied: job.dateApplied ?? '',
        interviewDates: job.interviewDates ?? [],
        jobUrl: job.jobUrl ?? '',
        jobDescription: job.jobDescription ?? '',
        notes: job.notes ?? '',
        contactName: job.contactName ?? '',
        contactEmail: job.contactEmail ?? '',
        followUpSent: job.followUpSent ?? false,
        followUpSentAt: job.followUpSentAt,
        interviewSelfScore: job.interviewSelfScore,
        interviewSelfNotes: job.interviewSelfNotes,
        hasResponse: job.hasResponse ?? false,
      });
      setInterviewInput('');
      return;
    }

    const st = initialStatus ?? 'applied';
    const today = new Date().toISOString().split('T')[0];

    if (persistDraft) {
      const d = readJobAddDraft();
      if (d?.form) {
        setForm(draftShapeToForm(d.form));
        setInterviewInput(d.interviewInput ?? '');
        baselineStatusRef.current = d.form.status;
        baselineDateRef.current = (d.form.dateApplied || '').trim() || today;
        return;
      }
    }

    setForm({ ...empty, status: st, dateApplied: today });
    setInterviewInput('');
    baselineStatusRef.current = st;
    baselineDateRef.current = today;
  }, [open, job, initialStatus, persistDraft]);

  useEffect(() => {
    if (!open || !persistDraft || job) return;
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      flushDraft(true, form, interviewInput, initialStatus ?? form.status);
    }, 320);
    return () => {
      if (persistTimer.current) clearTimeout(persistTimer.current);
    };
  }, [open, persistDraft, job, form, interviewInput, initialStatus, flushDraft]);

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function setFollowUpSent(checked: boolean) {
    const ts = now();
    setForm((f) => ({
      ...f,
      followUpSent: checked,
      followUpSentAt: checked ? (f.followUpSentAt ?? ts) : undefined,
    }));
  }

  function handleSelfScoreSave(score: number, notes: InterviewSelfNotes) {
    setForm((f) => ({
      ...f,
      interviewSelfScore: score,
      interviewSelfNotes: serializeInterviewSelfNotes(notes),
    }));
  }

  const gradePreviewJob = useMemo((): Job | null => {
    if (!job) return null;
    const draft: Job = {
      ...job,
      ...form,
      salary: form.salary || undefined,
    };
    return applyApplicationGrade(draft);
  }, [job, form]);

  function buildPayload(ts: string): Job {
    const followUpSent = form.followUpSent ?? false;
    const base: Job = {
      ...(job ?? { id: '', createdAt: ts }),
      company: form.company.trim(),
      role: form.role.trim(),
      location: form.location?.trim() || undefined,
      salary: (form.salary ?? '').trim() || undefined,
      status: form.status,
      dateApplied: form.dateApplied || undefined,
      interviewDates: form.interviewDates ?? [],
      jobUrl: form.jobUrl?.trim() || undefined,
      jobDescription: form.jobDescription?.trim() || undefined,
      notes: form.notes?.trim() || undefined,
      contactName: form.contactName?.trim() || undefined,
      contactEmail: form.contactEmail?.trim() || undefined,
      followUpSent,
      followUpSentAt: followUpSent ? (form.followUpSentAt ?? ts) : undefined,
      interviewSelfScore: form.interviewSelfScore,
      interviewSelfNotes: form.interviewSelfNotes,
      hasResponse: job?.hasResponse,
      updatedAt: ts,
    };
    if (!job) {
      const id = newId();
      return { ...base, id, createdAt: ts };
    }
    return { ...base, id: job.id, createdAt: job.createdAt };
  }

  function addInterviewDate() {
    if (!interviewInput) return;
    setForm((f) => ({ ...f, interviewDates: [...(f.interviewDates ?? []), interviewInput] }));
    setInterviewInput('');
  }

  function removeInterviewDate(d: string) {
    setForm((f) => ({ ...f, interviewDates: f.interviewDates?.filter((x) => x !== d) }));
  }

  function attemptClose() {
    if (job) {
      onClose();
      return;
    }
    if (persistDraft) {
      const dirty = isAddJobFormDirty(
        formToDraftShape(form),
        interviewInput,
        baselineStatusRef.current,
        baselineDateRef.current,
      );
      if (dirty) {
        const ok = window.confirm('Discard this job draft?');
        if (!ok) return;
      }
      clearJobAddDraft();
    }
    onClose();
  }

  async function save() {
    if (!form.company.trim() || !form.role.trim()) return;
    setSaving(true);
    const ts = now();
    const salaryOut = (form.salary ?? '').trim() || undefined;

    try {
      const payload = buildPayload(ts);
      payload.salary = salaryOut;

      if (job) {
        await db.updateJob(payload);

        if (form.status !== job.status) {
          if (form.status === 'recruiter_screen') await awardPoints('status_recruiter_screen', job.id, `Screen earned for ${form.company}`);
          else if (form.status === 'interviewing') await awardPoints('status_interviewing', job.id);
          else if (form.status === 'offer') await awardPoints('status_offer', job.id);
          else if (form.status === 'rejected') await awardPoints('status_rejected', job.id);
        }

        if (form.notes?.trim()) await awardPoints('notes_added', job.id);
      } else {
        const id = payload.id;
        await db.addJob(payload);
        await awardPoints('application_added', id);

        if (form.status === 'recruiter_screen') await awardPoints('status_recruiter_screen', id, `Screen earned for ${form.company}`);
        else if (form.status === 'interviewing') await awardPoints('status_interviewing', id);
        else if (form.status === 'offer') await awardPoints('status_offer', id);
        else if (form.status === 'rejected') await awardPoints('status_rejected', id);

        if (form.notes?.trim()) await awardPoints('notes_added', id);
      }

      if (persistDraft && !job) clearJobAddDraft();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  const title = job ? 'Edit Job' : 'Add Job';

  const formBody = (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Company *">
          <input value={form.company} onChange={(e) => set('company', e.target.value)} placeholder="Acme Corp" />
        </Field>
        <Field label="Role *">
          <input value={form.role} onChange={(e) => set('role', e.target.value)} placeholder="Software Engineer" />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Location">
          <input value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="Remote" />
        </Field>
        <Field label="Salary / Comp">
          <SalaryRangeSelect value={form.salary ?? ''} onChange={(v) => set('salary', v)} />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Status">
          <select value={form.status} onChange={(e) => set('status', e.target.value as JobStatus)}>
            {KANBAN_COLUMNS.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Date Applied">
          <input type="date" value={form.dateApplied} onChange={(e) => set('dateApplied', e.target.value)} />
        </Field>
      </div>

      <Field label="Job URL">
        <input value={form.jobUrl} onChange={(e) => set('jobUrl', e.target.value)} placeholder="https://..." />
      </Field>

      <Field label="Interview Dates">
        <div className="flex gap-2">
          <input
            type="date"
            value={interviewInput}
            onChange={(e) => setInterviewInput(e.target.value)}
            className="flex-1"
          />
          <button
            type="button"
            onClick={addInterviewDate}
            className="rounded-lg bg-violet-50 px-3 py-2 text-sm font-medium text-violet-600 hover:bg-violet-100"
          >
            Add
          </button>
        </div>
        {(form.interviewDates ?? []).length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {form.interviewDates!.map((d) => (
              <span key={d} className="flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-xs text-violet-700">
                {d}
                <button type="button" onClick={() => removeInterviewDate(d)} className="hover:text-red-500">×</button>
              </span>
            ))}
          </div>
        )}
      </Field>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Contact Name">
          <input value={form.contactName} onChange={(e) => set('contactName', e.target.value)} placeholder="Jane Smith" />
        </Field>
        <Field label="Contact Email">
          <input value={form.contactEmail} onChange={(e) => set('contactEmail', e.target.value)} placeholder="jane@acme.com" />
        </Field>
      </div>

      <Field label="Job Description">
        <textarea
          value={form.jobDescription}
          onChange={(e) => set('jobDescription', e.target.value)}
          rows={4}
          placeholder="Paste the job description here..."
        />
      </Field>

      <Field label="Notes">
        <textarea
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          rows={3}
          placeholder="Any notes..."
        />
      </Field>

      <div className="rounded-xl border border-stone-200/90 bg-stone-50/60 p-3.5 space-y-3">
        <label className="flex cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            checked={form.followUpSent ?? false}
            onChange={(e) => setFollowUpSent(e.target.checked)}
            className="h-4 w-4 rounded border-stone-300 text-violet-600 focus:ring-violet-300"
          />
          <span className="text-sm font-medium text-stone-700">Follow-up sent</span>
        </label>
        {form.followUpSent && form.followUpSentAt && (
          <p className="text-[11px] text-stone-500 pl-6">
            Marked {new Date(form.followUpSentAt).toLocaleDateString()}
          </p>
        )}

        {job && (
          <>
            <div className="flex flex-wrap items-center gap-2 border-t border-stone-200/80 pt-3">
              <button
                type="button"
                onClick={() => setSelfScoreOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200/80 bg-white px-3 py-2 text-xs font-semibold text-violet-700 shadow-sm transition hover:border-violet-300 hover:bg-violet-50"
              >
                <Star size={14} strokeWidth={2.25} />
                Interview Self Score
                {form.interviewSelfScore != null && (
                  <span className="rounded-md bg-violet-100 px-1.5 py-0.5 tabular-nums">
                    {form.interviewSelfScore}/5
                  </span>
                )}
              </button>
              {gradePreviewJob && (
                <ApplicationGradeBadge job={gradePreviewJob} size="md" />
              )}
            </div>
            {gradePreviewJob && (
              <p className="text-[11px] leading-snug text-stone-500">
                {explainApplicationGrade(gradePreviewJob)}
              </p>
            )}
            {form.interviewSelfScore != null && (
              <p className="text-[11px] text-stone-600">
                Self-score: {interviewSelfScoreLabel(form.interviewSelfScore)}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );

  const formActions = (
    <>
      <button type="button" onClick={attemptClose} className="rounded-lg px-4 py-2 text-sm text-stone-500 hover:text-stone-700">
        Cancel
      </button>
      <button
        type="button"
        onClick={save}
        disabled={!form.company.trim() || !form.role.trim() || saving}
        className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-40"
      >
        {saving ? 'Saving…' : job ? 'Save Changes' : 'Add Job'}
      </button>
    </>
  );

  const scoreModal = (
    <InterviewSelfScoreModal
      open={selfScoreOpen}
      onClose={() => setSelfScoreOpen(false)}
      initialScore={form.interviewSelfScore}
      initialNotes={form.interviewSelfNotes}
      onSave={handleSelfScoreSave}
    />
  );

  if (isAddJobFlow) {
    return (
      <>
      <div
        className="fixed inset-0 z-50 flex flex-col md:items-center md:justify-center md:p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="job-form-modal-title"
      >
        <div
          className="absolute inset-0 touch-none bg-black/40 md:bg-black/30"
          onClick={attemptClose}
          onTouchMove={(e) => e.preventDefault()}
          aria-hidden
        />
        <div className="relative z-10 flex min-h-0 w-full flex-1 flex-col bg-white shadow-xl max-md:max-h-[100dvh] md:max-h-[90vh] md:max-w-lg md:flex-initial md:rounded-2xl">
          <div className="flex shrink-0 items-center justify-between border-b border-stone-100 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:border-0 md:px-6 md:pt-6 md:pb-0">
            <h2 id="job-form-modal-title" className="text-lg font-semibold text-stone-800">
              {title}
            </h2>
            <button type="button" onClick={attemptClose} className="text-stone-400 hover:text-stone-600">
              <X size={20} />
            </button>
          </div>
          <div
            data-modal-scroll
            className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-4 md:max-h-[calc(90vh-8rem)] md:px-6"
          >
            {formBody}
          </div>
          <div className="flex shrink-0 gap-2 border-t border-stone-100 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:mt-6 md:justify-end md:border-0 md:px-6 md:pb-6 md:pt-0">
            {formActions}
          </div>
        </div>
      </div>
      {scoreModal}
      </>
    );
  }

  return (
    <>
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="job-form-modal-title"
    >
      <div className="absolute inset-0 bg-black/30" onClick={attemptClose} aria-hidden />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 id="job-form-modal-title" className="text-lg font-semibold text-stone-800">
            {title}
          </h2>
          <button type="button" onClick={attemptClose} className="text-stone-400 hover:text-stone-600">
            <X size={20} />
          </button>
        </div>
        {formBody}
        <div className="mt-6 flex justify-end gap-2">{formActions}</div>
      </div>
    </div>
    {scoreModal}
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-stone-500 mb-1">{label}</label>
      <div className="[&_input]:w-full [&_input]:border [&_input]:border-stone-200 [&_input]:rounded-lg [&_input]:px-3 [&_input]:py-2 [&_input]:text-sm [&_input]:focus:outline-none [&_input]:focus:ring-2 [&_input]:focus:ring-violet-300 [&_select]:w-full [&_select]:border [&_select]:border-stone-200 [&_select]:rounded-lg [&_select]:px-3 [&_select]:py-2 [&_select]:text-sm [&_select]:focus:outline-none [&_select]:focus:ring-2 [&_select]:focus:ring-violet-300 [&_select]:bg-white [&_textarea]:w-full [&_textarea]:border [&_textarea]:border-stone-200 [&_textarea]:rounded-lg [&_textarea]:px-3 [&_textarea]:py-2 [&_textarea]:text-sm [&_textarea]:focus:outline-none [&_textarea]:focus:ring-2 [&_textarea]:focus:ring-violet-300 [&_textarea]:resize-none">
        {children}
      </div>
    </div>
  );
}
