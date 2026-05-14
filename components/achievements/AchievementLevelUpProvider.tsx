'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AnimatePresence } from 'framer-motion';
import { subscribeAchievementLevelCheck } from '@/lib/achievementLevelUpEmitter';
import type { AchievementNotification } from '@/lib/types';
import { db } from '@/lib/db';
import AchievementLevelUpModal from './AchievementLevelUpModal';

type Ctx = { requestAchievementLevelCheck: () => Promise<void> };

const AchievementLevelUpContext = createContext<Ctx | null>(null);

export function useAchievementLevelUpRequest(): () => Promise<void> {
  const c = useContext(AchievementLevelUpContext);
  return c?.requestAchievementLevelCheck ?? (async () => {});
}

function dedupeById(notifs: AchievementNotification[]): AchievementNotification[] {
  const m = new Map(notifs.map((n) => [n.id, n]));
  return Array.from(m.values()).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function AchievementLevelUpProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<AchievementNotification[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const drain = useCallback(async () => {
    try {
      await db.syncAchievementLevelUpQueue();
      const pending = await db.fetchUnseenAchievementNotifications();
      setQueue((prev) =>
        dedupeById([...prev, ...pending.filter((p) => !prev.some((x) => x.id === p.id))]),
      );
    } catch {
      /* offline / migration */
    }
  }, []);

  const scheduleDrain = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      void drain();
    }, 400);
  }, [drain]);

  const requestAchievementLevelCheck = useCallback(async () => {
    await drain();
  }, [drain]);

  useEffect(() => {
    void drain();
    const unsub = subscribeAchievementLevelCheck(scheduleDrain);
    return () => {
      unsub();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [drain, scheduleDrain]);

  const active = queue[0] ?? null;

  const onContinue = useCallback(async () => {
    if (!active) return;
    await db.markAchievementNotificationSeen(active.id);
    setQueue((q) => q.slice(1));
    void drain();
  }, [active, drain]);

  const value = useMemo(() => ({ requestAchievementLevelCheck }), [requestAchievementLevelCheck]);

  return (
    <AchievementLevelUpContext.Provider value={value}>
      {children}
      <AnimatePresence mode="wait">
        {active && (
          <AchievementLevelUpModal key={active.id} notif={active} onContinue={onContinue} />
        )}
      </AnimatePresence>
    </AchievementLevelUpContext.Provider>
  );
}
