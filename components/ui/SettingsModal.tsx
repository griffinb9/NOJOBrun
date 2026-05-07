'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { storage } from '@/lib/storage';
import { isValidEmail, now } from '@/lib/utils';

interface Props {
  open: boolean;
  onClose: () => void;
  onProfileSaved?: () => void;
}

export default function SettingsModal({ open, onClose, onProfileSaved }: Props) {
  const [apiKey, setApiKey] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [profileErrors, setProfileErrors] = useState<{ fullName?: string; email?: string }>({});

  useEffect(() => {
    if (open) {
      const settings = storage.getSettings();
      setApiKey(settings.anthropicApiKey ?? '');

      const profile = storage.getUserProfile();
      setFullName(profile?.fullName ?? '');
      setEmail(profile?.email ?? '');
      setProfileErrors({});
    }
  }, [open]);

  function save() {
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

    if (nameTrimmed) {
      const existing = storage.getUserProfile();
      const ts = now();
      storage.saveUserProfile({
        id: existing?.id ?? ts,
        fullName: nameTrimmed,
        email: emailTrimmed.toLowerCase(),
        createdAt: existing?.createdAt ?? ts,
        updatedAt: ts,
      });
      // Notify any listener (e.g. Dashboard) that the profile changed
      window.dispatchEvent(new Event('nojob:profile-updated'));
      onProfileSaved?.();
    }

    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
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
