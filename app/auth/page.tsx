'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { isValidEmail } from '@/lib/utils';
import { normalizeUsername, validateUsername } from '@/lib/username';

type Mode = 'signin' | 'signup';

export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [errors, setErrors]     = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  function switchMode(m: Mode) {
    setMode(m);
    setErrors({});
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (mode === 'signup' && !fullName.trim()) errs.fullName = 'Full name is required.';
    if (mode === 'signup') {
      const uErr = validateUsername(normalizeUsername(username));
      if (uErr) errs.username = uErr;
    }
    if (!email.trim() || !isValidEmail(email)) errs.email = 'Enter a valid email address.';
    if (password.length < 6) errs.password = 'Password must be at least 6 characters.';
    if (mode === 'signup' && password !== confirm) errs.confirm = 'Passwords do not match.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setErrors({});

    if (mode === 'signin') {
      const { error } = await signIn(email, password);
      if (error) setErrors({ form: error });
    } else {
      const { error, needsConfirmation } = await signUp(email, password, fullName, username);
      if (error) {
        setErrors({ form: error });
      } else if (needsConfirmation) {
        setConfirmationSent(true);
      }
    }

    setSubmitting(false);
  }

  if (confirmationSent) {
    return (
      <div className="relative min-h-screen overflow-x-hidden overflow-y-auto bg-slate-950">
        <AuthBackdrop />
        <div className="relative z-10 flex min-h-screen items-start justify-center px-4 py-10 sm:items-center sm:py-12">
          <div className="w-full max-w-md">
            <AuthHero compact />
            <div className="rounded-2xl border border-white/15 bg-white/[0.07] p-6 shadow-[0_24px_80px_-20px_rgba(59,130,246,0.35)] backdrop-blur-2xl sm:rounded-3xl sm:p-8">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/30 to-violet-600/40 ring-1 ring-white/20">
                <span className="text-2xl" aria-hidden>✉️</span>
              </div>
              <h2 className="text-center text-lg font-bold tracking-tight text-white sm:text-xl">Check your email</h2>
              <p className="mt-3 text-center text-sm leading-relaxed text-slate-300">
                We sent a confirmation link to <strong className="text-white">{email}</strong>.
                Click it to activate your account, then come back to sign in.
              </p>
              <button
                type="button"
                onClick={() => { setConfirmationSent(false); switchMode('signin'); }}
                className="mt-8 w-full rounded-xl bg-white/10 py-3 text-sm font-semibold text-violet-200 ring-1 ring-white/15 transition hover:bg-white/15 hover:text-white"
              >
                Back to sign in
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const emailExists = errors.form === 'EMAIL_EXISTS';

  return (
    <div className="relative min-h-screen overflow-x-hidden overflow-y-auto bg-slate-950">
      <AuthBackdrop />

      <div className="relative z-10 flex min-h-screen flex-col items-center px-4 pb-16 pt-10 sm:justify-center sm:py-12">
        <div className="w-full max-w-md">
          <AuthHero />

          <div className="rounded-2xl border border-white/15 bg-white/[0.07] p-5 shadow-[0_24px_80px_-20px_rgba(99,102,241,0.4)] backdrop-blur-2xl sm:rounded-3xl sm:p-8">
            {/* Mode toggle */}
            <div className="mb-6 flex rounded-2xl border border-white/10 bg-slate-900/40 p-1 ring-1 ring-white/5">
              {(['signin', 'signup'] as Mode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => switchMode(m)}
                  className={`relative flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all ${
                    mode === m
                      ? 'bg-gradient-to-r from-blue-500 to-violet-600 text-white shadow-lg shadow-violet-500/25'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {m === 'signin' ? 'Log In' : 'Sign Up'}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <Field label="Full Name" error={errors.fullName}>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Griffin Boyle"
                    autoComplete="name"
                    className={inputCls(!!errors.fullName)}
                  />
                </Field>
              )}

              {mode === 'signup' && (
                <Field label="Username" error={errors.username}>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-500">@</span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
                      placeholder="griffinboyle"
                      autoComplete="username"
                      className={`${inputCls(!!errors.username)} pl-9`}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500">3–20 characters. Letters, numbers, _ and . only.</p>
                </Field>
              )}

              <Field label="Email" error={errors.email}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="griffin@example.com"
                  autoComplete="email"
                  inputMode="email"
                  className={inputCls(!!errors.email)}
                />
              </Field>

              <Field label="Password" error={errors.password}>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  className={inputCls(!!errors.password)}
                />
              </Field>

              {mode === 'signup' && (
                <Field label="Confirm Password" error={errors.confirm}>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className={inputCls(!!errors.confirm)}
                  />
                </Field>
              )}

              {errors.form && (
                emailExists ? (
                  <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-3 text-sm">
                    <p className="font-medium text-amber-100">An account with this email already exists.</p>
                    <button
                      type="button"
                      onClick={() => switchMode('signin')}
                      className="mt-2 text-sm font-semibold text-violet-300 hover:text-white hover:underline"
                    >
                      Log in instead →
                    </button>
                  </div>
                ) : (
                  <p className="rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2.5 text-sm text-red-200">
                    {errors.form}
                  </p>
                )
              )}

              <button
                type="submit"
                disabled={submitting}
                className="mt-3 w-full rounded-xl bg-gradient-to-r from-blue-500 via-violet-500 to-indigo-600 py-3.5 text-sm font-bold text-white shadow-[0_12px_40px_-8px_rgba(99,102,241,0.55)] transition hover:brightness-110 hover:shadow-[0_16px_48px_-8px_rgba(99,102,241,0.65)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100"
              >
                {submitting
                  ? (mode === 'signin' ? 'Logging in…' : 'Creating account…')
                  : (mode === 'signin' ? 'Log In' : 'Create Account')
                }
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-400">
              {mode === 'signin' ? (
                <>
                  New here?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('signup')}
                    className="font-semibold text-violet-300 hover:text-white hover:underline"
                  >
                    Create an account
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('signin')}
                    className="font-semibold text-violet-300 hover:text-white hover:underline"
                  >
                    Log in
                  </button>
                </>
              )}
            </p>
          </div>

          <p className="mt-8 text-center text-[11px] font-medium uppercase tracking-[0.2em] text-slate-600">
            Your hunt. Your wins.
          </p>
        </div>
      </div>
    </div>
  );
}

function AuthBackdrop() {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(99,102,241,0.35),transparent_55%),radial-gradient(ellipse_90%_60%_at_100%_50%,rgba(59,130,246,0.18),transparent_50%),radial-gradient(ellipse_80%_50%_at_0%_80%,rgba(139,92,246,0.15),transparent_45%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-32 top-1/4 h-72 w-72 rounded-full bg-blue-500/20 blur-[100px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-24 bottom-1/4 h-80 w-80 rounded-full bg-violet-600/25 blur-[110px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-px w-[min(100%,48rem)] -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent"
        aria-hidden
      />
    </>
  );
}

function AuthHero({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`text-center ${compact ? 'mb-8' : 'mb-8 sm:mb-10'}`}>
      {/* Soft glow behind wordmark — avoids gradient text + drop-shadow quirks */}
      <div className="relative mx-auto inline-block max-w-full px-1">
        <span
          className="pointer-events-none absolute left-1/2 top-1/2 h-[min(120%,8rem)] w-[min(100%,20rem)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-blue-500/45 via-violet-500/50 to-indigo-600/40 blur-3xl"
          aria-hidden
        />
        <h1
          className={
            compact
              ? 'relative text-[clamp(2.5rem,12vw,3.75rem)] font-black tracking-[-0.06em] leading-[0.95]'
              : 'relative text-[clamp(2.75rem,14vw,5.25rem)] sm:text-[clamp(3.5rem,12vw,5.75rem)] font-black tracking-[-0.07em] leading-[0.92]'
          }
        >
          <span className="bg-gradient-to-br from-sky-300 via-violet-300 to-indigo-400 bg-clip-text text-transparent">
            NOJOB
          </span>
        </h1>
      </div>

      <p
        className={`mx-auto max-w-[22rem] font-semibold leading-snug tracking-tight text-slate-100 sm:max-w-lg ${
          compact ? 'mt-3 text-base sm:text-lg' : 'mt-4 text-lg sm:text-xl md:text-2xl'
        }`}
      >
        From NoJob to YesJob
      </p>
      {!compact && (
        <p className="mx-auto mt-3 max-w-sm text-xs font-medium text-slate-500 sm:text-sm">
          Track applications, prep like a pro, unlock achievements.
        </p>
      )}
    </div>
  );
}

function inputCls(hasError: boolean) {
  return `w-full rounded-xl border px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 transition focus:outline-none focus:ring-2 focus:ring-violet-400/50 focus:border-violet-400/40 ${
    hasError
      ? 'border-red-400/50 bg-red-500/10'
      : 'border-white/10 bg-slate-950/40 hover:border-white/15'
  }`;
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-300">{error}</p>}
    </div>
  );
}
