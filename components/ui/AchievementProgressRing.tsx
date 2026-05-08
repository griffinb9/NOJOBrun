'use client';

import { useEffect, useState, useId } from 'react';
import type { LucideIcon } from 'lucide-react';

interface Props {
  percent: number;
  color: string;       // hex — ring stroke + icon bg tint
  iconColor: string;   // hex — icon stroke color
  isPlatinum: boolean;
  Icon: LucideIcon;
  size?: number;
}

const STROKE_WIDTH  = 9;
const BG_RING_COLOR = '#E7E5E4';
const PLATINUM_COLOR = '#7C3AED';

export default function AchievementProgressRing({
  percent,
  color,
  iconColor,
  isPlatinum,
  Icon,
  size = 96,
}: Props) {
  const uid         = useId().replace(/[^a-zA-Z0-9]/g, '');
  const gradientId  = `apg${uid}`;
  const glowId      = `apw${uid}`;

  const radius      = (size - STROKE_WIDTH) / 2;
  const circumference = 2 * Math.PI * radius;
  const rawPercent  = Math.min(100, Math.max(0, percent));

  const [animated, setAnimated] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimated(rawPercent));
    return () => cancelAnimationFrame(id);
  }, [rawPercent]);

  const dashOffset   = circumference - (animated / 100) * circumference;
  const strokeColor  = isPlatinum ? `url(#${gradientId})` : color;
  const cx = size / 2;
  const cy = size / 2;

  const iconBgOpacity = isPlatinum ? '1a' : '22'; // hex alpha
  const iconBgColor   = isPlatinum ? PLATINUM_COLOR : color;

  return (
    <div
      className="relative inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        aria-hidden="true"
        style={{ transform: 'rotate(-90deg)', position: 'absolute', inset: 0 }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>
          {isPlatinum && (
            <filter id={glowId} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
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
          strokeDashoffset={isPlatinum ? 0 : dashOffset}
          filter={isPlatinum ? `url(#${glowId})` : undefined}
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
      </svg>

      {/* Icon badge centered inside ring */}
      <div
        className="relative z-10 flex items-center justify-center rounded-full"
        style={{
          width: size * 0.52,
          height: size * 0.52,
          backgroundColor: iconBgColor + iconBgOpacity,
        }}
      >
        <Icon
          size={size * 0.24}
          style={{ color: isPlatinum ? PLATINUM_COLOR : iconColor }}
          strokeWidth={2}
        />
      </div>
    </div>
  );
}
