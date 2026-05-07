'use client';

import { useState } from 'react';
import { UserProfile } from '@/lib/types';
import { storage } from '@/lib/storage';
import { newId, now, isValidEmail } from '@/lib/utils';

interface Props {
  onComplete: (profile: UserProfile) => void;
}

export default function ProfileSetupModal({ onComplete }: Props) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<{ fullName?: string; email?: string }>({});

  function validate(): boolean {
    const errs: typeof errors = {};
    if (!fullName.trim()) errs.fullName = 'Full name is required.';
    if (!email.trim()) errs.email = 'Email address is required.';
    else if (!isValidEmail(email)) errs.email = 'Please enter a valid email address.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function save() {
    if (!validate()) return;
    const ts = now();
    const profile: UserProfile = {
      id: newId(),
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      createdAt: ts,
      updatedAt: ts,
    };
    storage.saveUserProfile(profile);
    onComplete(profile);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') save();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-50">
      {/* Full-page backdrop — not dismissible */}
      <div className="w-full max-w-md">
        {/* Logo / brand */}
        <div className="text-center mb-8">
          <span className="text-2xl font-bold text-violet-600 tracking-tight">NOJOB</span>
          <p className="text-stone-400 text-sm mt-1">Your job search, simplified</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-8">
          <h1 className="text-xl font-bold text-stone-800 mb-1">Let&apos;s set up your profile</h1>
          <p className="text-stone-400 text-sm mb-6">
            Just a couple things to get you started.
          </p>

          <div className="space-y-4">
            {/* Full name */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => { setFullName(e.target.value); setErrors((p) => ({ ...p, fullName: undefined })); }}
                onKeyDown={handleKey}
                placeholder="Griffin Boyle"
                autoFocus
                className={`w-full border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 transition-colors ${
                  errors.fullName ? 'border-red-300 bg-red-50' : 'border-stone-200'
                }`}
              />
              {errors.fullName && (
                <p className="text-xs text-red-500 mt-1">{errors.fullName}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: undefined })); }}
                onKeyDown={handleKey}
                placeholder="griffin@example.com"
                className={`w-full border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 transition-colors ${
                  errors.email ? 'border-red-300 bg-red-50' : 'border-stone-200'
                }`}
              />
              {errors.email && (
                <p className="text-xs text-red-500 mt-1">{errors.email}</p>
              )}
            </div>
          </div>

          <button
            onClick={save}
            className="mt-6 w-full bg-violet-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors"
          >
            Get Started
          </button>

          <p className="text-xs text-stone-400 text-center mt-4">
            Your info is stored locally in your browser only.
          </p>
        </div>
      </div>
    </div>
  );
}
