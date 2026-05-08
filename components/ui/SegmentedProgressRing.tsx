'use client';

import { useEffect, useState, useId } from 'react';
import type { ReactNode } from 'react';

interface Props {
  percent: number;
  size?: number;
  segmentCount?: number;
  children?: ReactNode;
}

const MAX_COLOR = '#10B981';

// Blue (#3B82F6) → Violet (#7C3AED) → Teal (#14B8A6)
function segmentColor(t: number, isMax: boolean): string {
  if (isMax) return MAX_COLOR;
  if (t <= 0.5) {
    const s = t * 2;
    return `rgb(${lerp(59,124,s)},${lerp(130,58,s)},${lerp(246,237,s)})`;
  }
  const s = (t - 0.5) * 2;
  return `rgb(${lerp(124,20,s)},${lerp(58,184,s)},${lerp(237,166,s)})`;
}

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

export default function SegmentedProgressRing({
  percent,
  size = 164,
  segmentCount = 32,
  children,
}: Props) {
  const uid    = useId().replace(/[^a-zA-Z0-9]/g, '');
  const glowSm = `sgs${uid}`;
  const glowLg = `sgl${uid}`;
  const pulseKf = `spr_p${uid}`;
  const tipCls  = `spr_t${uid}`;

  const cx   = size / 2;
  const cy   = size / 2;
  const R    = size * 0.40;
  const dotR = size * 0.034;

  const isMax      = percent >= 100;
  const clamped    = Math.min(100, Math.max(0, percent));
  const fullTarget = Math.round((clamped / 100) * segmentCount);

  const [displayCount, setDisplayCount] = useState(0);

  useEffect(() => {
    const target = isMax ? segmentCount : fullTarget;
    if (target === 0) { setDisplayCount(0); return; }

    let startTime: number | null = null;
    let animId: number;

    function step(now: number) {
      if (startTime === null) startTime = now;
      const t     = Math.min(1, (now - startTime) / 900);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayCount(Math.round(eased * target));
      if (t < 1) { animId = requestAnimationFrame(step); }
    }

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [percent, segmentCount, isMax, fullTarget]);

  const segments = Array.from({ length: segmentCount }, (_, i) => {
    const angle  = -Math.PI / 2 + (i / segmentCount) * 2 * Math.PI;
    const x      = cx + R * Math.cos(angle);
    const y      = cy + R * Math.sin(angle);
    const active = i < displayCount;
    const isTip  = active && i === displayCount - 1;
    const color  = active ? segmentColor(i / (segmentCount - 1), isMax) : 'rgba(148,163,184,0.30)';
    return { x, y, active, isTip, color };
  });

  return (
    <div
      className="relative inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        aria-hidden="true"
        overflow="visible"
        style={{ position: 'absolute', inset: 0 }}
      >
        <defs>
          {/* Scoped keyframe + tip class — uid prevents conflicts */}
          <style>{`
            @keyframes ${pulseKf} {
              0%,100% { opacity: 1; }
              50%      { opacity: 0.55; }
            }
            .${tipCls} {
              transform-box: fill-box;
              transform-origin: center;
              animation: ${pulseKf} 1.6s ease-in-out infinite;
            }
          `}</style>

          {/* Normal active segment glow */}
          <filter id={glowSm} x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="2.8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Stronger glow for tip */}
          <filter id={glowLg} x="-350%" y="-350%" width="800%" height="800%">
            <feGaussianBlur stdDeviation="5.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {segments.map(({ x, y, active, isTip, color }, i) => (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={isTip ? dotR * 1.55 : dotR}
            fill={color}
            className={isTip ? tipCls : undefined}
            filter={active ? `url(#${isTip ? glowLg : glowSm})` : undefined}
          />
        ))}
      </svg>

      {/* Center slot */}
      <div
        className="relative z-10 flex items-center justify-center"
        style={{ width: R * 2 - dotR * 2 - 10 }}
      >
        {children}
      </div>
    </div>
  );
}
