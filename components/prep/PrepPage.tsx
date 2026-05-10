'use client';

import { use, useEffect, useState } from 'react';
import { ArrowLeft, RefreshCw, Copy, Check, Loader2, FileText } from 'lucide-react';
import Link from 'next/link';
import { Job } from '@/lib/types';
import { storage } from '@/lib/storage';
import { db } from '@/lib/db';
import { useAuth } from '@/lib/auth';
import { awardPoints } from '@/lib/points';

interface Props {
  paramsPromise: Promise<{ jobId: string }>;
}

type Section = {
  key: string;
  label: string;
  content: string;
  loading: boolean;
};

const SECTIONS = [
  { key: 'tmay', label: 'Tell Me About Yourself' },
  { key: 'why-company', label: 'Why This Company' },
  { key: 'why-role', label: 'Why This Role' },
  { key: 'questions', label: 'Likely Interview Questions' },
  { key: 'star', label: 'STAR Answers' },
];

export default function PrepPage({ paramsPromise }: Props) {
  const { jobId } = use(paramsPromise);
  const { profile } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [sections, setSections] = useState<Section[]>(
    SECTIONS.map((s) => ({ ...s, content: '', loading: false }))
  );
  const [copied, setCopied] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    db.getJob(jobId).then((found) => {
      if (!found) { setNotFound(true); return; }
      setJob(found);
    });
  }, [jobId]);

  const resumeText = profile?.resumeText;

  async function generate(key: string) {
    if (!job) return;
    const stories = await db.getStories();
    const apiKey = storage.getSettings().anthropicApiKey;

    setSections((prev) =>
      prev.map((s) => (s.key === key ? { ...s, content: '', loading: true } : s))
    );

    try {
      const res = await fetch('/api/ai/prep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, job, stories, apiKey, resumeText }),
      });

      if (!res.ok) {
        const data = await res.json();
        setSections((prev) =>
          prev.map((s) =>
            s.key === key ? { ...s, loading: false, content: `Error: ${data.error ?? 'Something went wrong'}` } : s
          )
        );
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let text = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        const t = text;
        setSections((prev) =>
          prev.map((s) => (s.key === key ? { ...s, content: t } : s))
        );
      }

      // Award once per job — deduplication prevents repeat awards
      if (job) awardPoints('interview_prep_generated', job.id);
    } catch {
      setSections((prev) =>
        prev.map((s) =>
          s.key === key ? { ...s, content: 'Network error. Check your API key in Settings.', loading: false } : s
        )
      );
    } finally {
      setSections((prev) => prev.map((s) => (s.key === key ? { ...s, loading: false } : s)));
    }
  }

  async function generateAll() {
    for (const s of SECTIONS) {
      await generate(s.key);
    }
  }

  async function copy(key: string, content: string) {
    await navigator.clipboard.writeText(content);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  if (notFound) {
    return (
      <div className="p-8 text-center">
        <p className="text-stone-400">Job not found.</p>
        <Link href="/tracker" className="text-violet-600 text-sm mt-2 hover:underline block">
          Back to Tracker
        </Link>
      </div>
    );
  }

  if (!job) return null;

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto w-full">
      {/* Header */}
      <div className="mb-6">
        <Link href="/tracker" className="flex items-center gap-1.5 text-stone-400 hover:text-violet-600 text-sm mb-4">
          <ArrowLeft size={14} /> Back to Tracker
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-stone-800">Interview Prep</h1>
            <p className="text-stone-400 text-sm mt-0.5">
              {job.company} — {job.role}
            </p>
          </div>
          <button
            onClick={generateAll}
            className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-violet-700 shrink-0"
          >
            <RefreshCw size={14} />
            Generate All
          </button>
        </div>
      </div>

      {/* Resume nudge */}
      {!resumeText && (
        <div className="flex items-center gap-3 px-4 py-3 mb-2 bg-amber-50 border border-amber-200 rounded-xl">
          <FileText size={15} className="text-amber-500 shrink-0" />
          <p className="text-sm text-amber-700 flex-1">
            Upload or paste your resume on{' '}
            <Link href="/profile" className="font-medium text-violet-700 hover:underline">
              Profile
            </Link>{' '}
            for more personalized answers.
          </p>
        </div>
      )}

      {/* Sections */}
      <div className="space-y-4">
        {sections.map((section) => (
          <div key={section.key} className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-100">
              <h2 className="font-semibold text-stone-700 text-sm">{section.label}</h2>
              <div className="flex items-center gap-2">
                {section.content && !section.loading && (
                  <button
                    onClick={() => copy(section.key, section.content)}
                    className="flex items-center gap-1 text-xs text-stone-400 hover:text-violet-600"
                  >
                    {copied === section.key ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
                  </button>
                )}
                <button
                  onClick={() => generate(section.key)}
                  disabled={section.loading}
                  className="flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-800 font-medium disabled:opacity-50"
                >
                  {section.loading ? (
                    <><Loader2 size={12} className="animate-spin" /> Generating...</>
                  ) : (
                    <><RefreshCw size={12} /> {section.content ? 'Regenerate' : 'Generate'}</>
                  )}
                </button>
              </div>
            </div>
            <div className="p-5">
              {section.content ? (
                <textarea
                  value={section.content}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSections((prev) =>
                      prev.map((s) => (s.key === section.key ? { ...s, content: val } : s))
                    );
                  }}
                  className="w-full text-sm text-stone-700 resize-none focus:outline-none min-h-[100px]"
                  style={{ height: 'auto' }}
                  rows={Math.max(4, section.content.split('\n').length + 1)}
                />
              ) : (
                <p className="text-stone-400 text-sm">
                  Click <span className="font-medium text-violet-500">Generate</span> to create content for this section.
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
