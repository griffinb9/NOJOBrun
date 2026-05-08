'use client';

import { useState } from 'react';
import { Copy, Check, Loader2, Send } from 'lucide-react';
import { Job } from '@/lib/types';
import { storage } from '@/lib/storage';
import { awardPoints } from '@/lib/points';

type EmailType = 'thank-you' | 'check-in';

const EMAIL_OPTIONS: { type: EmailType; label: string; description: string }[] = [
  { type: 'thank-you', label: 'Post-Interview Thank You', description: 'Send after a phone screen or interview' },
  { type: 'check-in', label: 'Status Check-In', description: "Follow up when you haven't heard back" },
];

export default function EmailGenerator({ job }: { job: Job }) {
  const [selected, setSelected] = useState<EmailType | null>(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [markedSent, setMarkedSent] = useState(false);
  const [error, setError] = useState('');

  async function generate(type: EmailType) {
    setSelected(type);
    setContent('');
    setError('');
    setMarkedSent(false);
    setLoading(true);

    const apiKey = storage.getSettings().anthropicApiKey;
    const resumeText = storage.getUserProfile()?.resumeText;

    try {
      const res = await fetch('/api/ai/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, job, apiKey, resumeText }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Something went wrong');
        setLoading(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) { setLoading(false); return; }

      const decoder = new TextDecoder();
      let text = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setContent(text);
      }
    } catch {
      setError('Network error. Check your API key in Settings.');
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function markSent() {
    awardPoints('follow_up_sent', job.id);
    setMarkedSent(true);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-500">Generate a follow-up email draft for this application.</p>

      <div className="flex flex-col gap-2">
        {EMAIL_OPTIONS.map(({ type, label, description }) => (
          <button
            key={type}
            onClick={() => generate(type)}
            disabled={loading}
            className={`text-left px-4 py-3 rounded-xl border transition-colors ${
              selected === type
                ? 'border-violet-300 bg-violet-50'
                : 'border-stone-200 hover:border-violet-200 hover:bg-violet-50/50'
            } disabled:opacity-60`}
          >
            <div className="text-sm font-medium text-stone-700">{label}</div>
            <div className="text-xs text-stone-400 mt-0.5">{description}</div>
          </button>
        ))}
      </div>

      {error && (
        <div className="text-sm text-red-500 bg-red-50 rounded-xl p-3">
          {error}
        </div>
      )}

      {(loading || content) && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">
              {loading ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 size={12} className="animate-spin" /> Generating...
                </span>
              ) : 'Draft'}
            </span>
            {content && !loading && (
              <button
                onClick={copy}
                className="flex items-center gap-1 text-xs text-stone-400 hover:text-violet-600"
              >
                {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
              </button>
            )}
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={12}
            className="w-full text-sm border border-stone-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none bg-stone-50"
          />

          {/* Mark as Sent — awards follow_up_sent points */}
          {content && !loading && (
            <button
              onClick={markSent}
              disabled={markedSent}
              className={`flex items-center gap-2 w-full justify-center py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                markedSent
                  ? 'bg-green-50 text-green-600 border-green-200 cursor-default'
                  : 'border-stone-200 text-stone-500 hover:border-violet-300 hover:text-violet-600 hover:bg-violet-50'
              }`}
            >
              {markedSent ? (
                <><Check size={14} /> Marked as sent · +5 pts</>
              ) : (
                <><Send size={14} /> Mark as Sent</>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
