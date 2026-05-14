type Listener = () => void;

const listeners = new Set<Listener>();

export function subscribeAchievementLevelCheck(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Notify subscribers to run achievement tier detection (debounced in UI). */
export function emitAchievementLevelCheck(): void {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {
      /* ignore */
    }
  });
}
