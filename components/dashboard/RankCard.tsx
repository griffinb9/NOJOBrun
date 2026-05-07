'use client';

import { useEffect, useState } from 'react';
import { storage } from '@/lib/storage';
import { getRankProgress } from '@/lib/points';
import { UserProgress } from '@/lib/types';

interface Props {
  refreshKey?: number;
}

export default function RankCard({ refreshKey }: Props) {
  const [progress, setProgress] = useState<UserProgress | null>(null);

  useEffect(() => {
    setProgress(storage.getUserProgress());
  }, [refreshKey]);

  if (!progress) return null;

  const { current, next, progressPercent, pointsToNext } = getRankProgress(progress.totalPoints);
  const weeklyPercent = Math.min(100, Math.round((progress.weeklyPoints / progress.weeklyGoal) * 100));
  const isMaxRank = !next;

  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden mb-8">
      {/* Top strip — rank color accent */}
      <div className={`h-1 w-full ${current.barColor}`} />

      <div className="p-5 md:p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5">
          {/* Left: rank identity */}
          <div className="flex-1">
            <div className="flex items-center gap-2.5 mb-1">
              <span className={`text-xs font-semibold uppercase tracking-widest ${current.accentColor}`}>
                Personal Rank
              </span>
            </div>

            <h2 className="text-2xl font-bold text-stone-800 leading-tight">
              {isMaxRank ? '🏆 ' : ''}{current.name}
            </h2>
            <p className="text-stone-400 text-sm mt-1">{current.description}</p>

            {/* Progress to next rank */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-stone-400">
                  {isMaxRank
                    ? 'Top tier reached'
                    : `${pointsToNext} pts to ${next!.name}`}
                </span>
                <span className={`text-xs font-semibold ${current.accentColor}`}>
                  {progress.totalPoints} pts total
                </span>
              </div>
              <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${current.barColor} ${isMaxRank ? 'animate-pulse' : ''}`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              {!isMaxRank && (
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-stone-300">{current.name}</span>
                  <span className="text-xs text-stone-300">{next!.name}</span>
                </div>
              )}
              {isMaxRank && (
                <p className="text-xs text-stone-400 mt-1.5 text-center">
                  You&apos;ve reached the top tier. Keep collecting wins.
                </p>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="hidden md:block w-px bg-stone-100 self-stretch mx-2" />

          {/* Right: weekly momentum */}
          <div className="md:w-48 shrink-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-3">
              Weekly Momentum
            </p>

            <div className="flex items-end gap-1.5 mb-1">
              <span className="text-3xl font-bold text-stone-800 leading-none">
                {progress.weeklyPoints}
              </span>
              <span className="text-stone-400 text-sm mb-0.5">/ {progress.weeklyGoal} pts</span>
            </div>

            <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden mt-2">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  weeklyPercent >= 100 ? 'bg-green-400' : current.barColor
                }`}
                style={{ width: `${weeklyPercent}%` }}
              />
            </div>

            <p className="text-xs text-stone-400 mt-2">
              {weeklyPercent >= 100
                ? '✓ Weekly goal hit!'
                : `${progress.weeklyGoal - progress.weeklyPoints} pts to weekly goal`}
            </p>

            {/* Point legend */}
            <div className="mt-4 space-y-1">
              {QUICK_TIPS.map(({ label, pts }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs text-stone-400">{label}</span>
                  <span className={`text-xs font-medium ${current.accentColor}`}>+{pts}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const QUICK_TIPS = [
  { label: 'Apply to a job', pts: 5 },
  { label: 'Schedule interview', pts: 25 },
  { label: 'Generate prep', pts: 10 },
  { label: 'Add notes', pts: 3 },
];
