'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { isValidEmail } from '@/lib/utils';

type Mode = 'signin' | 'signup';

export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [errors, setErrors]     = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (mode === 'signup' && !fullName.trim()) errs.fullName = 'Full name is required.';
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
      const { error, needsConfirmation } = await signUp(email, password, fullName);
      if (error) {
        setErrors({ form: error });
      } else if (needsConfirmation) {
        setConfirmationSent(true);
      }
      // If !needsConfirmation, the auth state change fires and AppGate redirects
    }

    setSubmitting(false);
  }

  if (confirmationSent) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-blue-500 to-violet-600 bg-clip-text text-transparent">
            NOJOB
          </span>
          <div className="mt-8 bg-white rounded-2xl border border-stone-100 shadow-sm p-8">
            <div className="w-12 h-12 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">✉️</span>
            </div>
            <h2 className="text-lg font-bold text-stone-800 mb-2">Check your email</h2>
            <p className="text-stone-500 text-sm">
              We sent a confirmation link to <strong>{email}</strong>.
              Click it to activate your account, then come back to sign in.
            </p>
            <button
              onClick={() => { setConfirmationSent(false); setMode('signin'); }}
              className="mt-6 text-sm text-violet-600 hover:underline"
            >
              Back to sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-8">
          <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-blue-500 to-violet-600 bg-clip-text text-transparent">
            NOJOB
          </span>
          <p className="text-stone-400 text-sm mt-1">Your job search, simplified</p>
        </div>

        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-8">
          {/* Mode toggle */}
          <div className="flex rounded-xl border border-stone-200 p-1 mb-6">
            {(['signin', 'signup'] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setErrors({}); }}
                className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  mode === m
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'text-stone-500 hover:text-stone-700'
                }`}
              >
                {m === 'signin' ? 'Sign In' : 'Sign Up'}
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
                  autoFocus
                  className={inputCls(!!errors.fullName)}
                />
              </Field>
            )}

            <Field label="Email" error={errors.email}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="griffin@example.com"
                autoFocus={mode === 'signin'}
                className={inputCls(!!errors.email)}
              />
            </Field>

            <Field label="Password" error={errors.password}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
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
                  className={inputCls(!!errors.confirm)}
                />
              </Field>
            )}

            {errors.form && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {errors.form}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-blue-500 to-violet-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:from-blue-600 hover:to-violet-700 disabled:opacity-50 transition-all mt-2"
            >
              {submitting
                ? (mode === 'signin' ? 'Signing in…' : 'Creating account…')
                : (mode === 'signin' ? 'Sign In' : 'Create Account')
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function inputCls(hasError: boolean) {
  return `w-full border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 transition-colors ${
    hasError ? 'border-red-300 bg-red-50' : 'border-stone-200'
  }`;
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-stone-700 mb-1.5">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
