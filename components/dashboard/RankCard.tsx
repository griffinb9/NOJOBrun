'use client';

import { useEffect, useState } from 'react';
import { storage } from '@/lib/storage';
import { getRankProgress } from '@/lib/points';
import { UserProgress } from '@/lib/types';
import CircularProgress from '@/components/ui/CircularProgress';

interface Props {
  refreshKey?: number;
}

export default function RankCard({ refreshKey }: Props) {
  const [progress, setProgress] = useState<UserProgress | null>(null);

  useEffect(() => {
    setProgress(storage.getUserProgress());
  }, [refreshKey]);

  if (!progress) return null;

  const { current, next, pointsToNext } = getRankProgress(progress.totalPoints);
  const weeklyPercent = Math.min(100, Math.round((progress.weeklyPoints / progress.weeklyGoal) * 100));
  const isMaxRank = !next;

  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden mb-8">
      {/* Top accent strip */}
      <div className={`h-1 w-full ${current.barColor}`} />

      <div className="p-5 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-8">

          {/* Circular progress ring */}
          <div className="flex justify-center md:justify-start shrink-0">
            <CircularProgress
              currentPoints={progress.totalPoints}
              currentRankMin={current.minPoints}
              nextRankMin={next?.minPoints ?? null}
              rankName={current.name}
              size={148}
            />
          </div>

          {/* Rank identity + next rank copy */}
          <div className="flex-1 min-w-0">
            <span className={`text-xs font-semibold uppercase tracking-widest ${current.accentColor}`}>
              Personal Rank
            </span>

            <h2 className="text-2xl font-bold text-stone-800 leading-tight mt-0.5">
              {isMaxRank ? '🏆 ' : ''}{current.name}
            </h2>
            <p className="text-stone-400 text-sm mt-1">{current.description}</p>

            <div className="mt-4">
              {isMaxRank ? (
                <p className="text-sm text-emerald-600 font-medium">
                  You&apos;ve reached the top tier. Keep collecting wins.
                </p>
              ) : (
                <p className="text-sm text-stone-500">
                  <span className={`font-semibold ${current.accentColor}`}>{pointsToNext} pts</span>
                  {' '}away from{' '}
                  <span className="font-medium text-stone-700">{next!.name}</span>
                </p>
              )}
            </div>

            {/* Quick point guide */}
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5">
              {QUICK_TIPS.map(({ label, pts }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span className={`text-xs font-semibold ${current.accentColor}`}>+{pts}</span>
                  <span className="text-xs text-stone-400">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="hidden md:block w-px bg-stone-100 self-stretch" />

          {/* Weekly momentum */}
          <div className="md:w-44 shrink-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-3">
              Weekly Momentum
            </p>

            <div className="flex items-end gap-1.5 mb-2">
              <span className="text-3xl font-bold text-stone-800 leading-none">
                {progress.weeklyPoints}
              </span>
              <span className="text-stone-400 text-sm mb-0.5">/ {progress.weeklyGoal} pts</span>
            </div>

            <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  weeklyPercent >= 100 ? 'bg-emerald-400' : current.barColor
                }`}
                style={{ width: `${weeklyPercent}%` }}
              />
            </div>

            <p className="text-xs text-stone-400 mt-2">
              {weeklyPercent >= 100
                ? '✓ Weekly goal hit!'
                : `${progress.weeklyGoal - progress.weeklyPoints} pts to weekly goal`}
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}

const QUICK_TIPS = [
  { label: 'Apply', pts: 5 },
  { label: 'Recruiter Screen', pts: 15 },
  { label: 'Interview', pts: 25 },
  { label: 'Prep', pts: 10 },
  { label: 'Notes', pts: 3 },
];
