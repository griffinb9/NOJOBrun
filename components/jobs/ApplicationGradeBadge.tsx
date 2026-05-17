'use client';

import { useState } from 'react';
import type { Job } from '@/lib/types';
import {
  explainApplicationGrade,
  GRADE_BADGE_CLASSES,
  calculateApplicationGrade,
  type ApplicationGrade,
} from '@/lib/applicationGrade';

interface Props {
  job: Job;
  size?: 'sm' | 'md';
  className?: string;
}

export default function ApplicationGradeBadge({ job, size = 'sm', className = '' }: Props) {
  const [open, setOpen] = useState(false);
  const grade: ApplicationGrade =
    job.applicationGrade ?? calculateApplicationGrade(job).grade;
  const explanation = explainApplicationGrade(job);

  const sizeCls =
    size === 'md'
      ? 'min-w-[1.75rem] h-7 px-2 text-xs'
      : 'min-w-[1.5rem] h-6 px-1.5 text-[10px]';

  return (
    <span className={`relative inline-flex ${className}`}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className={`
          inline-flex items-center justify-center rounded-md border font-bold tabular-nums leading-none
          ring-1 shadow-sm transition hover:brightness-95
          ${sizeCls}
          ${GRADE_BADGE_CLASSES[grade]}
        `}
        title={explanation}
        aria-label={`Application grade ${grade}. ${explanation}`}
      >
        {grade}
      </button>
      {open && (
        <span
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1.5 w-[min(16rem,calc(100vw-2rem))] -translate-x-1/2 rounded-lg border border-slate-200/90 bg-white px-2.5 py-2 text-[11px] font-medium leading-snug text-slate-700 shadow-lg ring-1 ring-slate-900/5"
        >
          {explanation}
        </span>
      )}
    </span>
  );
}
