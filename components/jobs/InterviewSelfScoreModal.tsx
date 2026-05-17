'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { interviewSelfScoreLabel, parseInterviewSelfNotes, type InterviewSelfNotes } from '@/lib/applicationGrade';

interface Props {
  open: boolean;
  onClose: () => void;
  initialScore?: number;
  initialNotes?: string;
  onSave: (score: number, notes: InterviewSelfNotes) => void;
}

const SCORES = [1, 2, 3, 4, 5] as const;

export default function InterviewSelfScoreModal({
  open,
  onClose,
  initialScore,
  initialNotes,
  onSave,
}: Props) {
  const [score, setScore] = useState<number | null>(initialScore ?? null);
  const [wentWell, setWentWell] = useState('');
  const [couldImprove, setCouldImprove] = useState('');

  useEffect(() => {
    if (!open) return;
    setScore(initialScore ?? null);
    const parsed = parseInterviewSelfNotes(initialNotes);
    setWentWell(parsed.wentWell ?? '');
    setCouldImprove(parsed.couldImprove ?? '');
  }, [open, initialScore, initialNotes]);

  if (!open) return null;

  function handleSave() {
    if (score == null) return;
    onSave(score, { wentWell, couldImprove });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/35" onClick={onClose} aria-hidden />
      <div
        className="relative w-full max-w-md rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="interview-self-score-title"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 id="interview-self-score-title" className="text-base font-semibold text-stone-800">
            Interview Self Score
          </h3>
          <button type="button" onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <X size={18} />
          </button>
        </div>

        <p className="mb-3 text-xs text-stone-500">
          How do you think you did on your latest screen or interview?
        </p>

        <div className="mb-4 flex flex-wrap gap-2">
          {SCORES.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setScore(n)}
              className={`
                min-w-[3.5rem] flex-1 rounded-xl border px-2 py-2.5 text-center transition
                ${score === n
                  ? 'border-violet-400 bg-violet-50 text-violet-900 ring-2 ring-violet-300/50'
                  : 'border-stone-200 bg-stone-50/80 text-stone-600 hover:border-violet-200 hover:bg-violet-50/40'}
              `}
            >
              <span className="block text-sm font-bold tabular-nums">{n}</span>
              <span className="mt-0.5 block text-[9px] font-medium leading-tight">
                {interviewSelfScoreLabel(n)}
              </span>
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-stone-500">What went well?</span>
            <textarea
              value={wentWell}
              onChange={(e) => setWentWell(e.target.value)}
              rows={2}
              className="w-full resize-none rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
              placeholder="Optional"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-stone-500">What could improve?</span>
            <textarea
              value={couldImprove}
              onChange={(e) => setCouldImprove(e.target.value)}
              rows={2}
              className="w-full resize-none rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
              placeholder="Optional"
            />
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm text-stone-500 hover:text-stone-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={score == null}
            className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-40"
          >
            Save score
          </button>
        </div>
      </div>
    </div>
  );
}
