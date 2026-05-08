'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { db } from './db';
import { UserProfile } from './types';
import { now } from './utils';

// ── Types ────────────────────────────────────────────────────────────────────

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  /** true while session/profile are being resolved on first load */
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// ── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (u: User) => {
    try {
      const p = await db.getProfile();
      setProfile(p);
    } catch {
      setProfile(null);
    }
  }, []);

  // Hydrate on mount, then listen for auth changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        loadProfile(s.user).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        loadProfile(s.user);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  // ── Auth methods ───────────────────────────────────────────────────────────

  async function signIn(email: string, password: string): Promise<{ error: string | null }> {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }

  async function signUp(email: string, password: string, fullName: string): Promise<{ error: string | null; needsConfirmation: boolean }> {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message, needsConfirmation: false };

    const u = data.user;
    if (!u) return { error: 'Sign-up failed. Please try again.', needsConfirmation: false };

    // Email confirmation required — user must confirm before data ops succeed
    const needsConfirmation = !data.session;
    if (!needsConfirmation) {
      // Session exists → create profile + progress immediately
      const ts = now();
      const newProfile: UserProfile = {
        id: u.id, fullName: fullName.trim(), email: u.email ?? email,
        createdAt: ts, updatedAt: ts,
      };
      try {
        await db.saveProfile(newProfile);
        await db.initProgress();
        setProfile(newProfile);
      } catch {
        // Non-fatal — user can complete profile later
      }
    }

    return { error: null, needsConfirmation };
  }

  async function signOut(): Promise<void> {
    await supabase.auth.signOut();
    setProfile(null);
  }

  async function refreshProfile(): Promise<void> {
    if (!user) return;
    await loadProfile(user);
  }

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
