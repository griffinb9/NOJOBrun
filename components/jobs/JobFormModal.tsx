'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Job, JobStatus, KANBAN_COLUMNS } from '@/lib/types';
import { storage } from '@/lib/storage';
import { newId, now } from '@/lib/utils';
import { awardPoints } from '@/lib/points';

interface Props {
  open: boolean;
  onClose: () => void;
  job?: Job;
  initialStatus?: JobStatus;
}

const empty: Omit<Job, 'id' | 'createdAt' | 'updatedAt'> = {
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
};

export default function JobFormModal({ open, onClose, job, initialStatus }: Props) {
  const [form, setForm] = useState({ ...empty });
  const [interviewInput, setInterviewInput] = useState('');

  useEffect(() => {
    if (open) {
      if (job) {
        setForm({
          company: job.company,
          role: job.role,
          location: job.location ?? '',
          salary: job.salary ?? '',
          status: job.status,
          dateApplied: job.dateApplied ?? '',
          interviewDates: job.interviewDates ?? [],
          jobUrl: job.jobUrl ?? '',
          jobDescription: job.jobDescription ?? '',
          notes: job.notes ?? '',
          contactName: job.contactName ?? '',
          contactEmail: job.contactEmail ?? '',
        });
      } else {
        setForm({ ...empty, status: initialStatus ?? 'applied', dateApplied: new Date().toISOString().split('T')[0] });
      }
      setInterviewInput('');
    }
  }, [open, job]);

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function addInterviewDate() {
    if (!interviewInput) return;
    setForm((f) => ({ ...f, interviewDates: [...(f.interviewDates ?? []), interviewInput] }));
    setInterviewInput('');
  }

  function removeInterviewDate(d: string) {
    setForm((f) => ({ ...f, interviewDates: f.interviewDates?.filter((x) => x !== d) }));
  }

  function save() {
    if (!form.company.trim() || !form.role.trim()) return;
    const ts = now();

    if (job) {
      // Editing an existing job
      storage.updateJob({ ...job, ...form, updatedAt: ts });

      // Award points for status changes
      if (form.status !== job.status) {
        if (form.status === 'recruiter_screen') awardPoints('status_recruiter_screen', job.id);
        else if (form.status === 'interviewing') awardPoints('status_interviewing', job.id);
        else if (form.status === 'offer') awardPoints('status_offer', job.id);
        else if (form.status === 'rejected') awardPoints('status_rejected', job.id);
      }

      // Award notes_added once when notes go from empty to present
      if (form.notes?.trim()) awardPoints('notes_added', job.id);
    } else {
      // Creating a new job
      const id = newId();
      storage.addJob({ ...form, id, createdAt: ts, updatedAt: ts });
      awardPoints('application_added', id);

      // Award for status if created directly into a non-applied status
      if (form.status === 'recruiter_screen') awardPoints('status_recruiter_screen', id);
      else if (form.status === 'interviewing') awardPoints('status_interviewing', id);
      else if (form.status === 'offer') awardPoints('status_offer', id);
      else if (form.status === 'rejected') awardPoints('status_rejected', id);

      // Award notes_added if notes present at creation
      if (form.notes?.trim()) awardPoints('notes_added', id);
    }

    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-stone-800">{job ? 'Edit Job' : 'Add Job'}</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Company *">
              <input value={form.company} onChange={(e) => set('company', e.target.value)} placeholder="Acme Corp" />
            </Field>
            <Field label="Role *">
              <input value={form.role} onChange={(e) => set('role', e.target.value)} placeholder="Software Engineer" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Location">
              <input value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="Remote" />
            </Field>
            <Field label="Salary / Comp">
              <input value={form.salary} onChange={(e) => set('salary', e.target.value)} placeholder="$120k–$140k" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
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
                className="px-3 py-2 bg-violet-50 text-violet-600 rounded-lg text-sm font-medium hover:bg-violet-100"
              >
                Add
              </button>
            </div>
            {(form.interviewDates ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {form.interviewDates!.map((d) => (
                  <span key={d} className="flex items-center gap-1 text-xs bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full">
                    {d}
                    <button onClick={() => removeInterviewDate(d)} className="hover:text-red-500">×</button>
                  </span>
                ))}
              </div>
            )}
          </Field>

          <div className="grid grid-cols-2 gap-3">
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
        </div>

        <div className="flex gap-2 mt-6 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-stone-500 hover:text-stone-700 rounded-lg">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={!form.company.trim() || !form.role.trim()}
            className="px-4 py-2 text-sm bg-violet-600 text-white rounded-xl hover:bg-violet-700 font-medium disabled:opacity-40"
          >
            {job ? 'Save Changes' : 'Add Job'}
          </button>
        </div>
      </div>
    </div>
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
