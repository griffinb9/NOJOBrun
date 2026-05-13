'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { storage } from '@/lib/storage';
import Link from 'next/link';
import { isValidEmail, now } from '@/lib/utils';

interface Props {
  open: boolean;
  onClose: () => void;
  onProfileSaved?: () => void;
}

export default function SettingsModal({ open, onClose, onProfileSaved }: Props) {
  const { user, profile, refreshProfile } = useAuth();
  const [apiKey, setApiKey] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [profileErrors, setProfileErrors] = useState<{ fullName?: string; email?: string }>({});
  useEffect(() => {
    if (open) {
      const settings = storage.getSettings();
      setApiKey(settings.anthropicApiKey ?? '');
      setFullName(profile?.fullName ?? '');
      setEmail(profile?.email ?? '');
      setProfileErrors({});
    }
  }, [open, profile]);

  async function save() {
    const errs: typeof profileErrors = {};
    const nameTrimmed = fullName.trim();
    const emailTrimmed = email.trim();

    if (!nameTrimmed) errs.fullName = 'Full name is required.';
    if (emailTrimmed && !isValidEmail(emailTrimmed)) errs.email = 'Enter a valid email address.';

    if (Object.keys(errs).length > 0) {
      setProfileErrors(errs);
      return;
    }

    storage.saveSettings({ anthropicApiKey: apiKey.trim() || undefined });

    if (nameTrimmed && user && profile) {
      const ts = now();
      await db.saveProfile({
        ...profile,
        fullName: nameTrimmed,
        email: emailTrimmed.toLowerCase() || profile.email || user.email || '',
        updatedAt: ts,
      }, { omitResumeOnSchemaError: true });

      await refreshProfile();
      onProfileSaved?.();
    }

    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-stone-800">Settings</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-5">
          {/* Profile section */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-3">Profile</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => { setFullName(e.target.value); setProfileErrors((p) => ({ ...p, fullName: undefined })); }}
                  placeholder="Griffin Boyle"
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 ${
                    profileErrors.fullName ? 'border-red-300' : 'border-stone-200'
                  }`}
                />
                {profileErrors.fullName && (
                  <p className="text-xs text-red-500 mt-1">{profileErrors.fullName}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setProfileErrors((p) => ({ ...p, email: undefined })); }}
                  placeholder="griffin@example.com"
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 ${
                    profileErrors.email ? 'border-red-300' : 'border-stone-200'
                  }`}
                />
                {profileErrors.email && (
                  <p className="text-xs text-red-500 mt-1">{profileErrors.email}</p>
                )}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-stone-100" />

          <div className="rounded-xl border border-violet-100 bg-violet-50/50 px-4 py-3">
            <p className="text-xs font-semibold text-stone-600 mb-1">Resume & account details</p>
            <p className="text-xs text-stone-500 mb-2">
              Upload or paste your resume on your Profile page. It personalizes interview prep and follow-up emails.
            </p>
            <Link
              href="/profile"
              onClick={onClose}
              className="text-xs font-medium text-violet-700 hover:text-violet-900 hover:underline"
            >
              Open Profile →
            </Link>
          </div>

          {/* Divider */}
          <div className="border-t border-stone-100" />

          {/* API key section */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-3">AI</p>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Anthropic API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-ant-..."
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
              <p className="text-xs text-stone-400 mt-1">
                Stored locally. Used for email drafts and interview prep.
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-6 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-stone-500 hover:text-stone-700 rounded-lg">
            Cancel
          </button>
          <button
            onClick={save}
            className="px-4 py-2 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700 font-medium"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
