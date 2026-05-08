'use client';

import { useEffect, useState, useId } from 'react';
import type { LucideIcon } from 'lucide-react';

interface Props {
  percent: number;
  color: string;       // hex — ring stroke + glow
  lightColor: string;  // hex — lighter/complementary shade for gradient ring
  isPlatinum: boolean;
  Icon: LucideIcon;
  size?: number;
}

const STROKE_WIDTH  = 13;
const RING_TRACK    = '#1e1e2e';

export default function AchievementBadge({
  percent,
  color,
  lightColor,
  isPlatinum,
  Icon,
  size = 124,
}: Props) {
  const uid        = useId().replace(/[^a-zA-Z0-9]/g, '');
  const gradId     = `abg${uid}`;
  const glowFiltId = `agf${uid}`;

  const radius      = (size - STROKE_WIDTH) / 2;
  const circumference = 2 * Math.PI * radius;
  const rawPercent  = Math.min(100, Math.max(0, percent));

  const [animated, setAnimated] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimated(rawPercent));
    return () => cancelAnimationFrame(id);
  }, [rawPercent]);

  const dashOffset = circumference - (animated / 100) * circumference;
  const cx = size / 2;
  const cy = size / 2;

  // Badge inner circle is ~60% of total size
  const badgeSize = Math.round(size * 0.60);
  const iconSize  = Math.round(size * 0.235);

  // Platinum always shows full ring with blue→violet gradient
  const ringFull = isPlatinum;
  const gradStart = isPlatinum ? '#3B82F6' : color;
  const gradEnd   = isPlatinum ? '#7C3AED' : lightColor;

  return (
    <div
      className="relative inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      {/* ── SVG ring ── */}
      <svg
        width={size}
        height={size}
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor={gradStart} />
            <stop offset="100%" stopColor={gradEnd}   />
          </linearGradient>

          {/* Soft glow around the progress stroke */}
          <filter id={glowFiltId} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Track ring */}
        <circle
          cx={cx} cy={cy} r={radius}
          fill="none"
          stroke={RING_TRACK}
          strokeWidth={STROKE_WIDTH}
        />

        {/* Progress arc */}
        <circle
          cx={cx} cy={cy} r={radius}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={ringFull ? 0 : dashOffset}
          filter={`url(#${glowFiltId})`}
          style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
      </svg>

      {/* ── Badge inner circle ── */}
      <div
        className="relative z-10 flex items-center justify-center rounded-full overflow-hidden transition-transform duration-300 group-hover:scale-105"
        style={{
          width: badgeSize,
          height: badgeSize,
          background: `radial-gradient(circle at 38% 28%, #252535, #0e0e1a)`,
          border: `1.5px solid ${color}45`,
          boxShadow: [
            `0 0 0 1px rgba(255,255,255,0.06)`,
            `0 0 18px ${color}55`,
            `0 0 38px ${color}28`,
            `inset 0 1px 0 rgba(255,255,255,0.10)`,
            `0 6px 20px rgba(0,0,0,0.55)`,
          ].join(', '),
        }}
      >
        {/* Radial glow behind the icon */}
        <div
          className="absolute rounded-full"
          style={{
            width: '68%',
            height: '68%',
            background: `radial-gradient(circle, ${color}55 0%, transparent 72%)`,
          }}
        />

        {/* Glossy highlight at top */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background:
              'linear-gradient(170deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.04) 40%, transparent 60%)',
          }}
        />

        {/* Icon — large, white, glowing */}
        <Icon
          size={iconSize}
          strokeWidth={1.6}
          className="relative z-10"
          style={{
            color: '#ffffff',
            filter: `drop-shadow(0 0 5px ${color}dd) drop-shadow(0 0 12px ${color}88)`,
          }}
        />
      </div>
    </div>
  );
}
