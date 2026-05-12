'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LogOut, Settings, FileText, CheckCircle2, AlertCircle, Loader2, ChevronRight, Users,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import SettingsModal from '@/components/ui/SettingsModal';

export default function MobileProfile() {
  const router = useRouter();
  const { profile, signOut, refreshProfile } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
  }

  if (!profile) return null;

  const initials = profile.fullName
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('');

  const hasResume = !!profile.resumeText?.trim();

  return (
    <div className="min-h-full bg-stone-50">
      {/* Header */}
      <div className="bg-white px-5 pt-10 pb-6 border-b border-stone-100 text-center">
        {/* Avatar */}
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center mx-auto mb-3 shadow-md">
          <span className="text-white font-extrabold text-xl tracking-tight">{initials || '?'}</span>
        </div>
        <h1 className="text-lg font-bold text-stone-900">{profile.fullName || 'Your Profile'}</h1>
        <p className="text-sm text-stone-400 mt-0.5">{profile.email}</p>
      </div>

      <div className="px-4 py-5 space-y-3">

        {/* Resume status */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => router.push('/friends')}
            className="w-full flex items-center gap-3 px-5 py-4 hover:bg-stone-50 active:bg-stone-100 transition-colors border-b border-stone-50"
          >
            <Users size={18} className="text-violet-500 shrink-0" />
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-semibold text-stone-700">Friends</p>
              <p className="text-xs mt-0.5 text-stone-400">
                {profile.username?.trim() ? 'Squad up & compare stats' : 'Set a username in Profile to use'}
              </p>
            </div>
            <ChevronRight size={16} className="text-stone-300" />
          </button>
          <button
            type="button"
            onClick={() => router.push('/profile')}
            className="w-full flex items-center gap-3 px-5 py-4 hover:bg-stone-50 active:bg-stone-100 transition-colors"
          >
            <FileText size={18} className="text-stone-400 shrink-0" />
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-semibold text-stone-700">Resume</p>
              <p className={`text-xs mt-0.5 ${hasResume ? 'text-emerald-600' : 'text-amber-500'}`}>
                {hasResume ? 'Added — personalizes your prep' : 'Not added — tap to add'}
              </p>
            </div>
            {hasResume
              ? <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
              : <AlertCircle   size={16} className="text-amber-400 shrink-0" />
            }
          </button>
        </div>

        {/* Account & settings */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden divide-y divide-stone-50">
          <button
            onClick={() => setSettingsOpen(true)}
            className="w-full flex items-center gap-3 px-5 py-4 hover:bg-stone-50 active:bg-stone-100 transition-colors"
          >
            <Settings size={18} className="text-stone-400 shrink-0" />
            <span className="flex-1 text-left text-sm font-semibold text-stone-700">Settings</span>
            <ChevronRight size={16} className="text-stone-300" />
          </button>

          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full flex items-center gap-3 px-5 py-4 hover:bg-red-50 active:bg-red-100 transition-colors disabled:opacity-50"
          >
            {signingOut
              ? <Loader2 size={18} className="animate-spin text-stone-400 shrink-0" />
              : <LogOut  size={18} className="text-red-400 shrink-0" />
            }
            <span className="flex-1 text-left text-sm font-semibold text-red-500">
              {signingOut ? 'Signing out…' : 'Sign Out'}
            </span>
          </button>
        </div>

        {/* App info */}
        <div className="text-center pt-4">
          <p className="text-xs font-bold tracking-widest text-stone-300 uppercase">NOJOB</p>
          <p className="text-[11px] text-stone-300 mt-1">Your job search, simplified</p>
        </div>
      </div>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onProfileSaved={refreshProfile}
      />
    </div>
  );
}
