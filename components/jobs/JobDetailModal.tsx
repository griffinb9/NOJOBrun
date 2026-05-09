'use client';

import { useState } from 'react';
import { X, ExternalLink, Pencil, Trash2 } from 'lucide-react';
import { Job, STATUS_COLORS, STATUS_LABELS } from '@/lib/types';
import { db } from '@/lib/db';
import { formatDate } from '@/lib/utils';
import JobFormModal from './JobFormModal';
import EmailGenerator from '@/components/emails/EmailGenerator';
import Link from 'next/link';

interface Props {
  job: Job;
  onClose: () => void;
  onEdit: (job: Job) => void;
}

type Tab = 'details' | 'emails' | 'prep';

export default function JobDetailModal({ job, onClose, onEdit }: Props) {
  const [tab, setTab] = useState<Tab>('details');
  const [editOpen, setEditOpen] = useState(false);

  async function deleteJob() {
    if (!confirm('Delete this job?')) return;
    await db.deleteJob(job.id);
    onClose();
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'details', label: 'Details' },
    { id: 'emails', label: 'Emails' },
    { id: 'prep', label: 'Interview Prep' },
  ];

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/30" onClick={onClose} />
        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-start justify-between p-4 sm:p-5 border-b border-stone-100">
            <div className="flex-1 min-w-0 mr-4">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-stone-800">{job.company}</h2>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[job.status]}`}>
                  {STATUS_LABELS[job.status]}
                </span>
              </div>
              <p className="text-stone-500 text-sm mt-0.5">{job.role}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setEditOpen(true)}
                className="p-1.5 text-stone-400 hover:text-violet-600 rounded-lg hover:bg-violet-50"
              >
                <Pencil size={16} />
              </button>
              <button
                onClick={deleteJob}
                className="p-1.5 text-stone-400 hover:text-red-500 rounded-lg hover:bg-red-50"
              >
                <Trash2 size={16} />
              </button>
              <button onClick={onClose} className="p-1.5 text-stone-400 hover:text-stone-600 rounded-lg">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-stone-100 px-3 sm:px-5">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-2 sm:px-3 py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
                  tab === t.id
                    ? 'border-violet-600 text-violet-700'
                    : 'border-transparent text-stone-400 hover:text-stone-600'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5">
            {tab === 'details' && <DetailsTab job={job} />}
            {tab === 'emails' && <EmailGenerator job={job} />}
            {tab === 'prep' && (
              <div className="text-center py-10">
                <p className="text-stone-500 text-sm mb-4">
                  Generate personalized interview prep for this role.
                </p>
                <Link
                  href={`/prep/${job.id}`}
                  className="inline-flex items-center gap-2 bg-violet-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-violet-700"
                >
                  Open Interview Prep
                  <ExternalLink size={14} />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {editOpen && (
        <JobFormModal
          open={editOpen}
          job={job}
          onClose={() => { setEditOpen(false); onEdit(job); }}
        />
      )}
    </>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex gap-3">
      <span className="text-xs text-stone-400 w-28 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-stone-700 flex-1 break-words">{value}</span>
    </div>
  );
}

function DetailsTab({ job }: { job: Job }) {
  return (
    <div className="space-y-3">
      <Row label="Company" value={job.company} />
      <Row label="Role" value={job.role} />
      <Row label="Location" value={job.location} />
      <Row label="Salary" value={job.salary} />
      <Row label="Status" value={STATUS_LABELS[job.status]} />
      <Row label="Date Applied" value={job.dateApplied ? formatDate(job.dateApplied) : undefined} />
      {job.interviewDates && job.interviewDates.length > 0 && (
        <div className="flex gap-3">
          <span className="text-xs text-stone-400 w-28 shrink-0 pt-0.5">Interview Dates</span>
          <div className="flex flex-col gap-1">
            {job.interviewDates.map((d) => (
              <span key={d} className="text-sm text-stone-700">{formatDate(d)}</span>
            ))}
          </div>
        </div>
      )}
      <Row label="Contact" value={job.contactName} />
      <Row label="Contact Email" value={job.contactEmail} />
      {job.jobUrl && (
        <div className="flex gap-3">
          <span className="text-xs text-stone-400 w-28 shrink-0 pt-0.5">Job URL</span>
          <a
            href={job.jobUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-violet-600 hover:underline flex items-center gap-1"
          >
            Open link <ExternalLink size={12} />
          </a>
        </div>
      )}
      {job.notes && (
        <div className="flex gap-3">
          <span className="text-xs text-stone-400 w-28 shrink-0 pt-0.5">Notes</span>
          <p className="text-sm text-stone-700 whitespace-pre-wrap flex-1">{job.notes}</p>
        </div>
      )}
      {job.jobDescription && (
        <div>
          <p className="text-xs text-stone-400 mb-2">Job Description</p>
          <pre className="text-xs text-stone-600 bg-stone-50 rounded-lg p-3 whitespace-pre-wrap max-h-40 overflow-y-auto">
            {job.jobDescription}
          </pre>
        </div>
      )}
    </div>
  );
}
