'use client';

import { createContext, useContext, useState } from 'react';

export type MobileTab = 'home' | 'jobs' | 'prep' | 'profile';

interface MobileNavCtx {
  tab: MobileTab;
  setTab: (t: MobileTab) => void;
}

const Ctx = createContext<MobileNavCtx | null>(null);

export function MobileNavProvider({ children }: { children: React.ReactNode }) {
  const [tab, setTab] = useState<MobileTab>('home');
  return <Ctx.Provider value={{ tab, setTab }}>{children}</Ctx.Provider>;
}

export function useMobileNav(): MobileNavCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useMobileNav must be used inside MobileNavProvider');
  return ctx;
}
