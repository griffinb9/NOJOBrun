'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  User,
  Mail,
  Calendar,
  Trophy,
  FileText,
  Upload,
  Save,
  Loader2,
  Check,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { UserProgress } from '@/lib/types';
import { isValidEmail, now } from '@/lib/utils';
import {
  RESUME_MAX_CHARS,
  RESUME_TXT_MAX_BYTES,
  RESUME_UPLOAD_READ_ERROR,
  fileExtensionLower,
  sanitizeResumeText,
} from '@/lib/resume';
import { useMobileNav } from '@/lib/mobile-nav';

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const { setTab } = useMobileNav();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [progress, setProgress] = useState<UserProgress | null>(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [accountErrors, setAccountErrors] = useState<{ fullName?: string; email?: string }>({});

  const [draftText, setDraftText] = useState('');
  /** Set when a file upload succeeds; cleared when the user edits the textarea. */
  const [fileNameFromUpload, setFileNameFromUpload] = useState<string | undefined>(undefined);
  const [extracting, setExtracting] = useState(false);
  const [savingResume, setSavingResume] = useState(false);
  const [savingAccount, setSavingAccount] = useState(false);
  const [resumeMessage, setResumeMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    db.getUserProgress().then(setProgress);
  }, []);

  /* Reset form fields when the Supabase profile row changes (e.g. after save or refresh). */
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- controlled form must mirror server profile */
    if (!profile) return;
    setFullName(profile.fullName ?? '');
    setEmail(profile.email ?? '');
    setDraftText(profile.resumeText ?? '');
    setFileNameFromUpload(undefined);
    setAccountErrors({});
    setResumeMessage(null);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [profile]);

  if (!profile || !user) return null;

  const p = profile;
  const u = user;

  const sanitizedDraft = sanitizeResumeText(draftText);
  const savedText = (p.resumeText ?? '').trim();
  const hasSavedResume = savedText.length > 0;
  const draftDiffersFromSaved = sanitizedDraft !== savedText;
  const charsLeft = RESUME_MAX_CHARS - draftText.length;

  async function saveAccount(e: React.FormEvent) {
    e.preventDefault();
    const errs: typeof accountErrors = {};
    const nameTrimmed = fullName.trim();
    const emailTrimmed = email.trim();
    if (!nameTrimmed) errs.fullName = 'Full name is required.';
    if (emailTrimmed && !isValidEmail(emailTrimmed)) errs.email = 'Enter a valid email address.';
    if (Object.keys(errs).length > 0) {
      setAccountErrors(errs);
      return;
    }

    setSavingAccount(true);
    setAccountErrors({});
    const ts = now();
    try {
      await db.saveProfile({
        id: p.id,
        fullName: nameTrimmed,
        email: emailTrimmed.toLowerCase() || p.email || u.email || '',
        resumeText: p.resumeText,
        resumeFileName: p.resumeFileName,
        resumeUpdatedAt: p.resumeUpdatedAt,
        createdAt: p.createdAt,
        updatedAt: ts,
      }, { omitResumeOnSchemaError: true });
      await refreshProfile();
    } finally {
      setSavingAccount(false);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setResumeMessage(null);

    const ext = fileExtensionLower(file.name || '');
    const mime = (file.type || '').toLowerCase();
    const isTxt = ext === '.txt' || mime === 'text/plain';
    const isDocx =
      ext === '.docx'
      || mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const isPdf = ext === '.pdf' || mime === 'application/pdf';

    if (!isTxt && !isDocx && !isPdf) {
      setResumeMessage({
        type: 'err',
        text: 'Please upload a .docx, .pdf, or .txt file, or paste your resume text.',
      });
      return;
    }

    if (file.size > RESUME_TXT_MAX_BYTES) {
      setResumeMessage({ type: 'err', text: 'File too large (max 5 MB).' });
      return;
    }

    setExtracting(true);
    try {
      let rawText: string;
      let displayName: string;

      if (isTxt) {
        rawText = await new Promise<string>((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(typeof r.result === 'string' ? r.result : '');
          r.onerror = () => reject(new Error('read failed'));
          r.readAsText(file, 'UTF-8');
        });
        displayName = file.name || 'resume.txt';
      } else {
        const fd = new FormData();
        fd.set('file', file);
        const res = await fetch('/api/resume/extract', { method: 'POST', body: fd });
        const data = (await res.json()) as { text?: string; fileName?: string; error?: string };
        if (!res.ok) {
          setResumeMessage({ type: 'err', text: data.error ?? RESUME_UPLOAD_READ_ERROR });
          return;
        }
        rawText = typeof data.text === 'string' ? data.text : '';
        displayName = typeof data.fileName === 'string' ? data.fileName : file.name;
      }

      const trimmed = rawText.replace(/\0/g, '').trim();
      if (!trimmed) {
        setResumeMessage({ type: 'err', text: RESUME_UPLOAD_READ_ERROR });
        return;
      }
      const clipped = trimmed.slice(0, RESUME_MAX_CHARS);
      setDraftText(clipped);
      setFileNameFromUpload(displayName);
      if (trimmed.length > RESUME_MAX_CHARS) {
        setResumeMessage({
          type: 'ok',
          text: `Imported from ${displayName}. Text was trimmed to ${RESUME_MAX_CHARS.toLocaleString()} characters.`,
        });
      } else {
        setResumeMessage({
          type: 'ok',
          text: `Imported text from ${displayName}. Review the preview below, then click Save resume.`,
        });
      }
    } catch {
      setResumeMessage({ type: 'err', text: RESUME_UPLOAD_READ_ERROR });
    } finally {
      setExtracting(false);
    }
  }

  async function saveResume() {
    setSavingResume(true);
    setResumeMessage(null);
    const ts = now();
    const text = sanitizedDraft;
    const hadResume = hasSavedResume;
    const trimmedProfileText = (p.resumeText ?? '').trim();

    let resumeFileName: string | undefined;
    if (!text) {
      resumeFileName = undefined;
    } else if (fileNameFromUpload) {
      resumeFileName = fileNameFromUpload;
    } else if (text === trimmedProfileText) {
      resumeFileName = p.resumeFileName;
    } else {
      resumeFileName = undefined;
    }

    const savedFromFile =
      text
        ? (fileNameFromUpload ?? (text === trimmedProfileText ? p.resumeFileName : undefined))
        : undefined;

    try {
      await db.saveProfile({
        id: p.id,
        fullName: p.fullName,
        email: p.email,
        resumeText: text || undefined,
        resumeFileName: text ? resumeFileName : undefined,
        resumeUpdatedAt: text ? ts : undefined,
        createdAt: p.createdAt,
        updatedAt: ts,
      });
      await refreshProfile();
      setFileNameFromUpload(undefined);
      if (!text) {
        setResumeMessage({ type: 'ok', text: 'Resume cleared from your account.' });
      } else {
        const base = hadResume ? 'Resume updated.' : 'Resume saved.';
        const suffix = savedFromFile ? ` Stored from file: ${savedFromFile}` : '';
        setResumeMessage({ type: 'ok', text: `${base}${suffix}` });
      }
    } catch (err) {
      setResumeMessage({
        type: 'err',
        text: err instanceof Error ? err.message : 'Could not save resume.',
      });
    } finally {
      setSavingResume(false);
    }
  }

  function onDraftChange(value: string) {
    setDraftText(value.slice(0, RESUME_MAX_CHARS));
    setFileNameFromUpload(undefined);
    setResumeMessage(null);
  }

  const createdLabel = p.createdAt
    ? new Date(p.createdAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  const rankLabel = progress?.currentRank ?? null;
  const updatedLabel = p.resumeUpdatedAt
    ? new Date(p.resumeUpdatedAt).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : null;

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto w-full pb-24 md:pb-8">
      <Link
        href="/"
        onClick={() => setTab('profile')}
        className="md:hidden flex items-center gap-1.5 text-stone-400 hover:text-violet-600 text-sm mb-5"
      >
        <ArrowLeft size={14} /> Back
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-stone-800 tracking-tight">Profile</h1>
        <p className="text-stone-500 text-sm mt-1">
          Your account and resume power interview prep, emails, and tailored answers.
        </p>
      </div>

      <div className="space-y-6">
        {/* Account */}
        <section className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-100 bg-gradient-to-r from-slate-50/80 to-white">
            <h2 className="font-semibold text-stone-800 text-sm flex items-center gap-2">
              <User size={16} className="text-violet-500" />
              Account
            </h2>
          </div>
          <form onSubmit={saveAccount} className="p-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="flex items-center gap-1.5 text-xs font-medium text-stone-500 mb-1">
                  <User size={12} /> Full name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    setAccountErrors((a) => ({ ...a, fullName: undefined }));
                  }}
                  className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200 ${
                    accountErrors.fullName ? 'border-red-300' : 'border-stone-200'
                  }`}
                />
                {accountErrors.fullName && (
                  <p className="text-xs text-red-500 mt-1">{accountErrors.fullName}</p>
                )}
              </div>
              <div className="sm:col-span-2">
                <label className="flex items-center gap-1.5 text-xs font-medium text-stone-500 mb-1">
                  <Mail size={12} /> Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setAccountErrors((a) => ({ ...a, email: undefined }));
                  }}
                  className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200 ${
                    accountErrors.email ? 'border-red-300' : 'border-stone-200'
                  }`}
                />
                {accountErrors.email && (
                  <p className="text-xs text-red-500 mt-1">{accountErrors.email}</p>
                )}
              </div>
            </div>

            <dl className="grid gap-3 sm:grid-cols-2 text-sm pt-2 border-t border-stone-50">
              {createdLabel && (
                <div className="flex gap-2">
                  <Calendar size={16} className="text-stone-400 shrink-0 mt-0.5" />
                  <div>
                    <dt className="text-xs text-stone-400 font-medium">Member since</dt>
                    <dd className="text-stone-700">{createdLabel}</dd>
                  </div>
                </div>
              )}
              {rankLabel && (
                <div className="flex gap-2">
                  <Trophy size={16} className="text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <dt className="text-xs text-stone-400 font-medium">Current rank</dt>
                    <dd className="text-stone-700 font-medium">{rankLabel}</dd>
                  </div>
                </div>
              )}
              <div className="flex gap-2 sm:col-span-2">
                <FileText size={16} className="text-stone-400 shrink-0 mt-0.5" />
                <div>
                  <dt className="text-xs text-stone-400 font-medium">Resume status</dt>
                  <dd className={hasSavedResume ? 'text-emerald-700 font-medium' : 'text-amber-700 font-medium'}>
                    {hasSavedResume ? 'Uploaded' : 'Not uploaded'}
                  </dd>
                </div>
              </div>
              {updatedLabel && hasSavedResume && (
                <div className="flex gap-2 sm:col-span-2">
                  <Calendar size={16} className="text-stone-400 shrink-0 mt-0.5" />
                  <div>
                    <dt className="text-xs text-stone-400 font-medium">Last resume update</dt>
                    <dd className="text-stone-700">{updatedLabel}</dd>
                    {p.resumeFileName && (
                      <p className="text-xs text-stone-400 mt-0.5">
                        Source file: <span className="text-stone-600">{p.resumeFileName}</span>
                      </p>
                    )}
                  </div>
                </div>
              )}
            </dl>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={savingAccount}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50"
              >
                {savingAccount ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save account
              </button>
            </div>
          </form>
        </section>

        {/* Resume */}
        <section className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-100 bg-gradient-to-r from-slate-50/80 to-white">
            <h2 className="font-semibold text-stone-800 text-sm flex items-center gap-2">
              <FileText size={16} className="text-violet-500" />
              Your resume
            </h2>
            <p className="text-xs text-stone-500 mt-1">
              Upload <span className="font-medium">DOCX, PDF, or TXT</span> and we will extract the text, or paste your resume manually. Only the text is stored in your account (not the original file).
            </p>
          </div>

          <div className="p-5 space-y-4">
            {!hasSavedResume && !draftText.trim() && (
              <div className="flex gap-3 px-4 py-3 rounded-xl bg-violet-50/80 border border-violet-100 text-sm text-violet-900">
                <AlertCircle size={18} className="shrink-0 text-violet-500 mt-0.5" />
                <p>Upload or paste your resume to make your interview prep more personalized.</p>
              </div>
            )}

            {resumeMessage && (
              <div
                className={`flex items-start gap-2 text-sm px-3 py-2 rounded-xl ${
                  resumeMessage.type === 'ok'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                    : 'bg-red-50 text-red-700 border border-red-100'
                }`}
              >
                {resumeMessage.type === 'ok' ? <Check size={16} className="shrink-0 mt-0.5" /> : <AlertCircle size={16} className="shrink-0 mt-0.5" />}
                {resumeMessage.text}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={extracting}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border border-stone-200 bg-white text-stone-700 hover:border-violet-200 hover:bg-violet-50/50 disabled:opacity-50"
              >
                {extracting ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                {extracting ? 'Reading file…' : 'Upload DOCX, PDF, or TXT'}
              </button>
              {draftDiffersFromSaved && (
                <span className="text-xs text-amber-600 font-medium">Unsaved changes</span>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-stone-500 mb-1 block">Resume text</label>
              <textarea
                value={draftText}
                onChange={(e) => onDraftChange(e.target.value)}
                rows={12}
                placeholder="Paste your resume here, or upload a file above…"
                className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200 resize-y min-h-[200px]"
              />
              <div className="flex justify-between items-center mt-1.5">
                <span className={`text-xs ${charsLeft < 500 ? 'text-amber-600' : 'text-stone-400'}`}>
                  {draftText.length.toLocaleString()} / {RESUME_MAX_CHARS.toLocaleString()} characters
                </span>
              </div>
            </div>

            {draftText.trim() && fileNameFromUpload && (
              <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-4">
                <p className="text-xs font-semibold text-violet-800 uppercase tracking-wide mb-2">
                  Imported preview — {fileNameFromUpload}
                </p>
                <pre className="text-xs text-stone-700 whitespace-pre-wrap font-sans max-h-48 overflow-y-auto leading-relaxed">
                  {sanitizedDraft}
                </pre>
              </div>
            )}

            <div className="flex flex-wrap gap-2 justify-end">
              {hasSavedResume && (
                <button
                  type="button"
                    onClick={() => {
                    onDraftChange('');
                    setResumeMessage(null);
                  }}
                  className="px-3 py-2 rounded-xl text-sm font-medium text-stone-500 hover:bg-stone-100"
                >
                  Clear draft
                </button>
              )}
              <button
                type="button"
                onClick={saveResume}
                disabled={savingResume}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50"
              >
                {savingResume ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {hasSavedResume ? 'Update resume' : 'Save resume'}
              </button>
            </div>

            {hasSavedResume && (
              <div className="rounded-xl border border-stone-100 bg-stone-50/80 p-4">
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
                  Saved resume preview
                </p>
                {p.resumeFileName && (
                  <p className="text-xs text-stone-500 mb-2">
                    Source file: <span className="font-medium text-stone-700">{p.resumeFileName}</span>
                  </p>
                )}
                <pre className="text-xs text-stone-700 whitespace-pre-wrap font-sans max-h-48 overflow-y-auto leading-relaxed">
                  {savedText}
                </pre>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
