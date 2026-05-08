'use client';

import { useEffect, useState, useId } from 'react';

interface Props {
  currentPoints: number;
  currentRankMin: number;
  nextRankMin: number | null; // null = max rank
  rankName: string;
  size?: number;
}

const STROKE_WIDTH = 11;
const MAX_RANK_COLOR = '#10B981'; // emerald-500
const BG_RING_COLOR  = '#E7E5E4'; // stone-200
const GRAD_START     = '#3B82F6'; // blue-500
const GRAD_END       = '#7C3AED'; // violet-600

export default function CircularProgress({
  currentPoints,
  currentRankMin,
  nextRankMin,
  rankName,
  size = 148,
}: Props) {
  // Stable unique IDs — safe with React 18+ useId
  const uid        = useId().replace(/[^a-zA-Z0-9]/g, '');
  const gradientId = `rg${uid}`;
  const glowId     = `gw${uid}`;

  const isMaxRank  = nextRankMin === null;
  const radius     = (size - STROKE_WIDTH) / 2;
  const circumference = 2 * Math.PI * radius;

  const rawPercent = isMaxRank
    ? 100
    : nextRankMin === currentRankMin
    ? 0
    : Math.min(100, Math.max(0, ((currentPoints - currentRankMin) / (nextRankMin - currentRankMin)) * 100));

  const [animatedPercent, setAnimatedPercent] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimatedPercent(rawPercent));
    return () => cancelAnimationFrame(id);
  }, [rawPercent]);

  const dashOffset    = circumference - (animatedPercent / 100) * circumference;
  const strokeColor   = isMaxRank ? MAX_RANK_COLOR : `url(#${gradientId})`;
  const centerColor   = isMaxRank ? MAX_RANK_COLOR : GRAD_START;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <div className="relative inline-flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        aria-hidden="true"
        style={{ transform: 'rotate(-90deg)' }}
      >
        <defs>
          {/* Blue→violet gradient for normal ranks */}
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor={GRAD_START} />
            <stop offset="100%" stopColor={GRAD_END}   />
          </linearGradient>

          {/* Glow filter for max rank */}
          {isMaxRank && (
            <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          )}
        </defs>

        {/* Background ring */}
        <circle
          cx={cx} cy={cy} r={radius}
          fill="none"
          stroke={BG_RING_COLOR}
          strokeWidth={STROKE_WIDTH}
        />

        {/* Progress ring */}
        <circle
          cx={cx} cy={cy} r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          filter={isMaxRank ? `url(#${glowId})` : undefined}
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
      </svg>

      {/* Center label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-stone-400 leading-none mb-1.5 px-2 truncate max-w-full">
          {rankName}
        </span>
        <span className="text-2xl font-bold leading-none" style={{ color: centerColor }}>
          {currentPoints}
        </span>
        <span className="text-xs text-stone-400 leading-none mt-0.5">pts</span>
        {!isMaxRank && rawPercent > 0 && (
          <span className="text-[10px] text-stone-300 mt-1.5 leading-none">
            {Math.round(rawPercent)}%
          </span>
        )}
        {isMaxRank && (
          <span className="text-[10px] mt-1.5 leading-none font-medium" style={{ color: MAX_RANK_COLOR }}>
            max rank
          </span>
        )}
      </div>
    </div>
  );
}
