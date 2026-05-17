/**
 * Locks page scroll while a modal is open (mobile WebViews / iOS Safari).
 * Supports nested modals via a ref count. Restores scroll position on unlock.
 */

const SCROLL_ROOT_SELECTOR = '[data-scroll-lock-root]';
const MODAL_SCROLL_SELECTOR = '[data-modal-scroll]';

type SavedStyle = {
  overflow: string;
  position: string;
  top: string;
  left: string;
  right: string;
  width: string;
  touchAction: string;
};

let lockCount = 0;
let savedWindowScrollY = 0;
const savedElementStyles = new Map<HTMLElement, SavedStyle>();

function snapshotStyle(el: HTMLElement): SavedStyle {
  return {
    overflow: el.style.overflow,
    position: el.style.position,
    top: el.style.top,
    left: el.style.left,
    right: el.style.right,
    width: el.style.width,
    touchAction: el.style.touchAction,
  };
}

function restoreStyle(el: HTMLElement, snap: SavedStyle) {
  el.style.overflow = snap.overflow;
  el.style.position = snap.position;
  el.style.top = snap.top;
  el.style.left = snap.left;
  el.style.right = snap.right;
  el.style.width = snap.width;
  el.style.touchAction = snap.touchAction;
}

function isInsideModalScroll(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest(MODAL_SCROLL_SELECTOR));
}

function onDocumentTouchMove(e: TouchEvent) {
  if (isInsideModalScroll(e.target)) return;
  e.preventDefault();
}

export function isMobileViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 767px)').matches;
}

/** Lock background scroll. Safe to call multiple times (ref-counted). */
export function lockModalScroll(): void {
  if (typeof document === 'undefined') return;

  lockCount += 1;
  if (lockCount > 1) return;

  savedWindowScrollY = window.scrollY;
  savedElementStyles.clear();

  const { body } = document;
  savedElementStyles.set(body, snapshotStyle(body));
  body.style.overflow = 'hidden';
  body.style.position = 'fixed';
  body.style.top = `-${savedWindowScrollY}px`;
  body.style.left = '0';
  body.style.right = '0';
  body.style.width = '100%';
  body.style.touchAction = 'none';

  document.querySelectorAll<HTMLElement>(SCROLL_ROOT_SELECTOR).forEach((el) => {
    savedElementStyles.set(el, snapshotStyle(el));
    el.style.overflow = 'hidden';
    el.style.touchAction = 'none';
  });

  document.addEventListener('touchmove', onDocumentTouchMove, { passive: false });
}

/** Release scroll lock when the last lock is cleared. */
export function unlockModalScroll(): void {
  if (typeof document === 'undefined') return;
  if (lockCount === 0) return;

  lockCount -= 1;
  if (lockCount > 0) return;

  document.removeEventListener('touchmove', onDocumentTouchMove);

  savedElementStyles.forEach((snap, el) => {
    restoreStyle(el, snap);
  });
  savedElementStyles.clear();

  window.scrollTo(0, savedWindowScrollY);
}
