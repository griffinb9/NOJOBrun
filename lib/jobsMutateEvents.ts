export const JOBS_MUTATED_EVENT = 'nojob:jobs-mutated';

export function emitJobsMutated(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(JOBS_MUTATED_EVENT));
}

export function subscribeJobsMutated(fn: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(JOBS_MUTATED_EVENT, fn);
  return () => window.removeEventListener(JOBS_MUTATED_EVENT, fn);
}
