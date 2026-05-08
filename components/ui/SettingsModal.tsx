'use client';

import { useEffect, useState } from 'react';
import { X, Check } from 'lucide-react';
import { storage } from '@/lib/storage';
import { isValidEmail, now } from '@/lib/utils';

interface Props {
  open: boolean;
  onClose: () => void;
  onProfileSaved?: () => void;
}

const RESUME_MAX = 15000;

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, '');
}

export default function SettingsModal({ open, onClose, onProfileSaved }: Props) {
  const [apiKey, setApiKey] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [profileErrors, setProfileErrors] = useState<{ fullName?: string; email?: string }>({});
  const [resumeText, setResumeText] = useState('');
  const [resumeUpdatedAt, setResumeUpdatedAt] = useState<string | undefined>(undefined);
  const [resumeSaved, setResumeSaved] = useState(false);

  useEffect(() => {
    if (open) {
      const settings = storage.getSettings();
      setApiKey(settings.anthropicApiKey ?? '');

      const profile = storage.getUserProfile();
      setFullName(profile?.fullName ?? '');
      setEmail(profile?.email ?? '');
      setResumeText(profile?.resumeText ?? '');
      setResumeUpdatedAt(profile?.resumeUpdatedAt);
      setProfileErrors({});
      setResumeSaved(false);
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
      const sanitized = stripHtml(resumeText).slice(0, RESUME_MAX);
      const resumeChanged = sanitized !== (existing?.resumeText ?? '');

      storage.saveUserProfile({
        id: existing?.id ?? ts,
        fullName: nameTrimmed,
        email: emailTrimmed.toLowerCase(),
        resumeText: sanitized || undefined,
        resumeUpdatedAt: resumeChanged && sanitized ? ts : existing?.resumeUpdatedAt,
        createdAt: existing?.createdAt ?? ts,
        updatedAt: ts,
      });

      window.dispatchEvent(new Event('nojob:profile-updated'));
      onProfileSaved?.();
    }

    onClose();
  }

  function saveResume() {
    const existing = storage.getUserProfile();
    if (!existing) return;
    const ts = now();
    const sanitized = stripHtml(resumeText).slice(0, RESUME_MAX);
    storage.saveUserProfile({
      ...existing,
      resumeText: sanitized || undefined,
      resumeUpdatedAt: sanitized ? ts : existing.resumeUpdatedAt,
      updatedAt: ts,
    });
    setResumeUpdatedAt(sanitized ? ts : existing.resumeUpdatedAt);
    setResumeSaved(true);
    setTimeout(() => setResumeSaved(false), 3000);
  }

  if (!open) return null;

  const charsLeft = RESUME_MAX - resumeText.length;
  const previewSnippet = resumeText.trim().slice(0, 120);

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

          {/* Resume section */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-1">Resume</p>
            <p className="text-xs text-stone-400 mb-3">
              Used to personalize interview prep and email drafts. Paste plain text only.
            </p>

            <textarea
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value.slice(0, RESUME_MAX))}
              rows={8}
              placeholder="Paste your resume here…"
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none"
            />

            <div className="flex items-center justify-between mt-1.5">
              <div className="flex items-center gap-3">
                {resumeUpdatedAt && (
                  <span className="text-xs text-stone-400">
                    Last updated {new Date(resumeUpdatedAt).toLocaleDateString()}
                  </span>
                )}
                {resumeSaved && (
                  <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                    <Check size={11} /> Resume saved
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs ${charsLeft < 500 ? 'text-amber-500' : 'text-stone-300'}`}>
                  {resumeText.length.toLocaleString()} / {RESUME_MAX.toLocaleString()}
                </span>
                <button
                  type="button"
                  onClick={saveResume}
                  disabled={!storage.getUserProfile()}
                  className="px-3 py-1.5 text-xs bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-lg font-medium disabled:opacity-40"
                >
                  Save Resume
                </button>
              </div>
            </div>

            {previewSnippet && !resumeSaved && resumeText.trim() === (storage.getUserProfile()?.resumeText ?? '').trim() && (
              <div className="mt-2 px-3 py-2 bg-stone-50 rounded-lg border border-stone-100">
                <p className="text-xs text-stone-400 font-medium mb-0.5">Saved resume preview</p>
                <p className="text-xs text-stone-500 line-clamp-2">{previewSnippet}{resumeText.trim().length > 120 ? '…' : ''}</p>
              </div>
            )}
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
