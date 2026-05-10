'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { UserProfile } from '@/lib/types';
import { now } from '@/lib/utils';

interface Props {
  onComplete: () => Promise<void> | void;
}

export default function ProfileSetupModal({ onComplete }: Props) {
  const { user } = useAuth();
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!fullName.trim()) { setError('Full name is required.'); return; }
    if (!user) return;
    setSaving(true);
    setError('');
    const ts = now();
    const profile: UserProfile = {
      id: user.id,
      fullName: fullName.trim(),
      email: user.email ?? '',
      createdAt: ts,
      updatedAt: ts,
    };
    try {
      await db.saveProfile(profile, { omitResumeOnSchemaError: true });
      await db.initProgress();
      await onComplete();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') save();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-blue-500 to-violet-600 bg-clip-text text-transparent">
            NOJOB
          </span>
          <p className="text-stone-400 text-sm mt-1">Your job search, simplified</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-8">
          <h1 className="text-xl font-bold text-stone-800 mb-1">One last thing</h1>
          <p className="text-stone-400 text-sm mb-6">What should we call you?</p>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => { setFullName(e.target.value); setError(''); }}
              onKeyDown={handleKey}
              placeholder="Griffin Boyle"
              autoFocus
              className={`w-full border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 transition-colors ${
                error ? 'border-red-300 bg-red-50' : 'border-stone-200'
              }`}
            />
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </div>

          <button
            onClick={save}
            disabled={saving}
            className="mt-6 w-full bg-gradient-to-r from-blue-500 to-violet-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:from-blue-600 hover:to-violet-700 disabled:opacity-50 transition-all"
          >
            {saving ? 'Saving…' : 'Get Started'}
          </button>
        </div>
      </div>
    </div>
  );
}
