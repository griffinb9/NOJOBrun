'use client';

import { useLayoutEffect } from 'react';
import { isMobileViewport, lockModalScroll, unlockModalScroll } from '@/lib/modalScrollLock';

/**
 * Locks background scroll on mobile while `active` is true.
 * No-op on desktop (≥768px). Cleans up on unmount and when `active` becomes false.
 */
export function useModalScrollLock(active: boolean): void {
  useLayoutEffect(() => {
    if (!active || !isMobileViewport()) return;

    lockModalScroll();
    return () => {
      unlockModalScroll();
    };
  }, [active]);
}
