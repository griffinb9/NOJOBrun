'use client';

import { avatarFallbackGradientClass, avatarInitials } from '@/lib/avatar';

interface Props {
  src?: string | null;
  fullName: string;
  displayName?: string | null;
  username?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  imgClassName?: string;
}

const sizeClasses: Record<NonNullable<Props['size']>, string> = {
  sm: 'h-8 w-8 text-[10px]',
  md: 'h-10 w-10 text-xs',
  lg: 'h-14 w-14 text-base',
  xl: 'h-20 w-20 text-xl',
};

function cx(...parts: (string | false | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

/**
 * Profile image with gradient + initials fallback (never exposes private job data).
 */
export default function UserAvatar({
  src,
  fullName,
  displayName,
  username,
  size = 'md',
  className,
  imgClassName,
}: Props) {
  const label = displayName?.trim() || fullName?.trim() || username?.trim() || 'Member';
  const initials = avatarInitials({ fullName, displayName, username });
  const grad = avatarFallbackGradientClass(`${label}|${username ?? ''}`);

  const sz = sizeClasses[size];

  if (src?.trim()) {
    return (
      <span
        className={cx(
          'relative inline-flex shrink-0 overflow-hidden rounded-full bg-stone-200 ring-2 ring-white/90 shadow-md',
          sz,
          className,
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- public Supabase URL; avoid remotePatterns */}
        <img
          src={src.trim()}
          alt=""
          className={cx('h-full w-full object-cover', imgClassName)}
          referrerPolicy="no-referrer"
        />
      </span>
    );
  }

  return (
    <span
      className={cx(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-bold text-white shadow-md ring-2 ring-white/50',
        grad,
        sz,
        className,
      )}
    >
      <span className="select-none tracking-tight">{initials}</span>
    </span>
  );
}
