'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { db } from './db';
import { UserProfile } from './types';
import { normalizeUsername, validateUsername } from './username';
import { now } from './utils';

// ── Types ────────────────────────────────────────────────────────────────────

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  /** true while session/profile are being resolved */
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    username: string,
  ) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// ── Stale-state cleanup ───────────────────────────────────────────────────────

/**
 * Remove localStorage keys written by the pre-Supabase app.
 * All user data now lives in Supabase; these keys are dead weight and could
 * previously trigger the old localStorage-based onboarding modal.
 * nojob_settings is intentionally preserved — it holds the Anthropic API key.
 */
const STALE_KEYS = [
  'nojob_user_profile',
  'nojob_user_progress',
  'nojob_point_events',
  // Intentionally NOT clearing nojob_jobs / nojob_stories:
  // PrepPage and EmailGenerator still read from them until they are fully migrated.
];

function clearStaleLocalStorage(): void {
  if (typeof window === 'undefined') return;
  STALE_KEYS.forEach((k) => localStorage.removeItem(k));
}

/**
 * Try to read the old pre-Supabase nojob_user_profile from localStorage.
 * Returns null if nothing useful is found.
 */
function readLegacyProfile(): { fullName?: string; email?: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('nojob_user_profile');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && (parsed.fullName || parsed.email)) return parsed;
  } catch {
    // malformed JSON — ignore
  }
  return null;
}

// ── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Fetch the profile row for a user.
   *
   * Auto-create sources (tried in priority order when no DB row exists):
   *   1. auth.user_metadata.full_name — set during signUp via options.data
   *   2. legacy nojob_user_profile in localStorage — migration path for users
   *      who signed up before the Supabase migration
   *
   * After a successful auto-create the localStorage entry is removed so the
   * next load goes straight to Supabase.
   */
  const loadProfile = useCallback(async (u: User) => {
    // Build an in-memory profile from whatever we know about the user.
    // This is used as a fallback when the DB is unavailable (e.g. tables not yet created).
    const buildFallback = (): UserProfile => {
      const metaName = (u.user_metadata?.full_name as string | undefined)?.trim() ?? '';
      const metaUser = normalizeUsername((u.user_metadata?.username as string | undefined) ?? '');
      const legacy   = readLegacyProfile();
      const ts = now();
      return {
        id: u.id,
        fullName: metaName || legacy?.fullName?.trim() || '',
        email:    legacy?.email || u.email || '',
        username: metaUser || undefined,
        createdAt: ts, updatedAt: ts,
      };
    };

    try {
      let p = await db.getProfile();

      if (!p) {
        const newProfile = buildFallback();
        try {
          await db.saveProfile(newProfile, { omitResumeOnSchemaError: true });
          await db.initProgress();
          if (typeof window !== 'undefined') localStorage.removeItem('nojob_user_profile');
        } catch {
          // DB unavailable (e.g. tables not yet migrated) — use in-memory profile
          // so the app still loads. Data will persist to DB once tables exist.
        }
        p = newProfile;
      }

      setProfile(p);
    } catch {
      // Absolute fallback — never leave user stuck on a blank screen
      setProfile(buildFallback());
    }
  }, []);

  // Hydrate on mount, then listen for auth changes
  useEffect(() => {
    // Clear stale pre-Supabase localStorage keys on every app startup
    clearStaleLocalStorage();

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        loadProfile(s.user).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        // Show spinner while resolving profile on sign-in to prevent modal flash
        if (event === 'SIGNED_IN') setLoading(true);
        loadProfile(s.user).finally(() => setLoading(false));
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  // ── Auth methods ───────────────────────────────────────────────────────────

  async function signIn(email: string, password: string): Promise<{ error: string | null }> {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }

  async function signUp(
    email: string,
    password: string,
    fullName: string,
    username: string,
  ): Promise<{ error: string | null; needsConfirmation: boolean }> {
    const uNorm = normalizeUsername(username);
    const uErr = validateUsername(uNorm);
    if (uErr) return { error: uErr, needsConfirmation: false };
    const available = await db.isUsernameAvailable(uNorm);
    if (!available) return { error: 'That username is already taken.', needsConfirmation: false };

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName.trim(), username: uNorm },
      },
    });
    if (error) return { error: error.message, needsConfirmation: false };

    const u = data.user;
    if (!u) return { error: 'Sign-up failed. Please try again.', needsConfirmation: false };

    // Supabase returns identities: [] when the email is already registered.
    // It does not surface an error to avoid leaking account existence, but we
    // can detect it and give a clear prompt to log in instead.
    if (Array.isArray(u.identities) && u.identities.length === 0) {
      return { error: 'EMAIL_EXISTS', needsConfirmation: false };
    }

    const needsConfirmation = !data.session;

    // With an immediate session, create the profile row now.
    // If this fails, loadProfile will retry via metadata on the next SIGNED_IN event.
    if (!needsConfirmation) {
      const ts = now();
      const newProfile: UserProfile = {
        id: u.id,
        fullName: fullName.trim(),
        email: u.email ?? email,
        username: uNorm,
        createdAt: ts,
        updatedAt: ts,
      };
      try {
        await db.saveProfile(newProfile, { omitResumeOnSchemaError: true });
        await db.initProgress();
        setProfile(newProfile);
      } catch {
        // Non-fatal — loadProfile (triggered by onAuthStateChange) will retry
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
