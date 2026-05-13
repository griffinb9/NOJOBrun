'use client';

import { useEffect, useState } from 'react';
import {
  Send, PhoneCall, Mic, Trophy, MailCheck, Sparkles, BookOpen, Zap, Flame, X, Loader2, Shield,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { db } from '@/lib/db';
import type { PublicFriendCard } from '@/lib/types';
import { publicDisplayLabel } from '@/lib/public-profile';
import { formatUsernameAt } from '@/lib/username';
import {
  achievementTierPillText,
  computeFriendAchievementsFromCounts,
  formatTierNameDisplay,
  type ComputedAchievement,
  TIER_STYLE,
} from '@/lib/achievements';
import AchievementBadge from '@/components/ui/AchievementBadge';
import UserAvatar from '@/components/ui/UserAvatar';

const ACHIEVEMENT_ICONS: Record<string, LucideIcon> = {
  jobs_applied: Send,
  max_apps_one_day: Zap,
  recruiter_screens: PhoneCall,
  interviews: Mic,
  offers: Trophy,
  follow_ups: MailCheck,
  resilience: Shield,
  prep_kits: Sparkles,
  star_stories: BookOpen,
  longest_streak: Flame,
};

const BADGE_COLORS: Record<string, { color: string; light: string }> = {
  jobs_applied: { color: '#3B82F6', light: '#60A5FA' },
  max_apps_one_day: { color: '#D97706', light: '#FBBF24' },
  recruiter_screens: { color: '#8B5CF6', light: '#A78BFA' },
  interviews: { color: '#F43F5E', light: '#FB7185' },
  offers: { color: '#10B981', light: '#34D399' },
  follow_ups: { color: '#F59E0B', light: '#FCD34D' },
  resilience: { color: '#DC2626', light: '#FB923C' },
  prep_kits: { color: '#7C3AED', light: '#A78BFA' },
  star_stories: { color: '#14B8A6', light: '#2DD4BF' },
  longest_streak: { color: '#EA580C', light: '#FB923C' },
};

function getMicrocopy(id: string, progressPercent: number, isPlatinum: boolean): string {
  if (isPlatinum) {
    if (id === 'resilience') return 'You kept showing up. That is the whole game.';
    return 'Platinum tier — fully unlocked.';
  }
  const tables: Record<string, [string, string, string, string]> = {
    jobs_applied: ['Start sending. Volume builds luck.', 'Keep the streak alive.', 'Consistency is the cheat code.', 'Apps don\'t apply themselves.'],
    max_apps_one_day: ['One focused day can move the needle.', 'Stack reps when you\'re in the zone.', 'High output, high reward.', 'Blitz mode: unlocked.'],
    recruiter_screens: ['Getting on their radar.', 'Past the initial filter.', 'Screens are a skill too.', 'Making the shortlist.'],
    interviews: ['Every interview is practice.', 'Each rep sharpens the edge.', 'Getting comfortable in the room.', 'Interview machine energy.'],
    offers: ['Offer energy loading...', 'One offer changes everything.', 'Turning interviews into offers.', 'Offer season.'],
    follow_ups: ['The follow-up is the differentiator.', 'Persistent, not desperate.', 'Following up closes the loop.', 'Never ghosting back.'],
    prep_kits: ['Prep is an unfair advantage.', 'Walking in confident.', 'The work happens before the call.', 'Overprepared is the only prepared.'],
    star_stories: ['Stories win interviews.', 'Story bank growing.', 'Ready for any behavioral.', 'Every story is a weapon.'],
    longest_streak: ['Streaks start with one day.', 'Building the chain.', 'Consistency compounds.', 'Unstoppable momentum.'],
    resilience: ['Showing up is half the win.', 'Every no sharpens your pitch.', 'Volume turns setbacks into data.', 'You keep going — that is the edge.'],
  };
  const pool = tables[id] ?? ['Keep going.', 'Building momentum.', 'Almost there.', 'So close.'];
  const idx = progressPercent >= 75 ? 3 : progressPercent >= 50 ? 2 : progressPercent >= 20 ? 1 : 0;
  return pool[Math.min(idx, pool.length - 1)];
}

interface Props {
  open: boolean;
  onClose: () => void;
  card: PublicFriendCard | null;
}

export default function FriendProfileModal({ open, onClose, card }: Props) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [achievements, setAchievements] = useState<ComputedAchievement[]>([]);

  useEffect(() => {
    if (!open || !card) {
      setAchievements([]);
      setErr('');
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr('');
      try {
        const res = await db.getFriendAchievementSummary(card.userId);
        if (cancelled) return;
        if (!res.ok) {
          setErr(res.error === 'not_friends' ? 'You can only view badges for accepted friends.' : 'Could not load badges.');
          setAchievements([]);
          return;
        }
        setAchievements(computeFriendAchievementsFromCounts(res.counts ?? {}));
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'Could not load badges.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, card]);

  if (!open || !card) return null;

  const earned = achievements.filter((a) => a.count > 0).length;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="friend-profile-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-stone-900/50 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-3xl max-h-[92vh] sm:max-h-[90vh] overflow-hidden rounded-t-3xl sm:rounded-3xl bg-stone-50 shadow-2xl border border-stone-200/80 flex flex-col"
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-stone-200/80 bg-white/95 shrink-0">
          <h2 id="friend-profile-title" className="text-sm font-bold text-stone-800 uppercase tracking-wide">
            Public profile
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-800 transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 overscroll-contain">
          <div className="bg-gradient-to-r from-violet-600 via-fuchsia-600 to-violet-600 text-white px-5 py-6">
            <div className="flex items-start gap-4">
              <UserAvatar
                src={card.avatarUrl}
                fullName={card.fullName}
                displayName={card.displayName}
                username={card.username}
                size="xl"
                className="ring-2 ring-white/50 shadow-xl shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xl font-bold leading-tight">
                  {publicDisplayLabel({ displayName: card.displayName, fullName: card.fullName })}
                </p>
                <p className="text-white/90 text-sm font-medium mt-1">{formatUsernameAt(card.username)}</p>
                <div className="flex flex-wrap gap-2 mt-4 text-xs font-semibold">
                  <span className="rounded-full bg-white/20 px-3 py-1">{card.currentRank}</span>
                  <span className="rounded-full bg-white/20 px-3 py-1">{card.totalPoints} pts</span>
                  <span className="rounded-full bg-white/20 px-3 py-1">{card.currentStreak}d current streak</span>
                  <span className="rounded-full bg-white/20 px-3 py-1">{card.longestStreak}d best streak</span>
                </div>
                <p className="text-[11px] text-white/75 mt-3 leading-relaxed">
                  Badges reflect public stats only — no companies, roles, or private notes.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 md:p-6">
            {err && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2 mb-4">{err}</p>
            )}
            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="animate-spin text-violet-500" size={32} />
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
                  <div>
                    <h3 className="text-lg font-bold text-stone-900 tracking-tight">Achievements</h3>
                    <p className="text-stone-500 text-xs mt-1">Same milestones as your Achievements page.</p>
                  </div>
                  {achievements.length > 0 && (
                    <div className="text-right">
                      <div className="text-xl font-bold text-stone-900 tabular-nums leading-none">{earned}</div>
                      <div className="text-[11px] text-stone-400 mt-0.5">of {achievements.length} started</div>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                  {achievements.map((a) => (
                    <FriendAchievementTile key={a.id} achievement={a} />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FriendAchievementTile({ achievement: a }: { achievement: ComputedAchievement }) {
  const style = TIER_STYLE[a.currentTier.name] ?? TIER_STYLE['Bronze 1'];
  const isPlatinum = !a.nextTier;
  const Icon = ACHIEVEMENT_ICONS[a.id] ?? Trophy;
  const palette = BADGE_COLORS[a.id] ?? { color: '#6366F1', light: '#818CF8' };
  const microcopy = getMicrocopy(a.id, a.progressPercent, isPlatinum);
  const started = a.count > 0 || Boolean(a.preFirstTier);
  const nextLabel = isPlatinum
    ? 'Maximum tier reached'
    : `${a.toNextTier} more ${a.toNextTier === 1 ? a.unit : `${a.unit}s`} to ${formatTierNameDisplay(a.nextTier!.name)}`;
  const countLabel = a.id === 'max_apps_one_day' ? 'Personal best (one day)' : null;

  return (
    <div
      className={`
        group relative flex flex-col items-center text-center
        bg-white rounded-2xl border border-stone-100 overflow-hidden
        shadow-[0_2px_12px_rgba(0,0,0,0.06)]
        border-t-[3px] ${style.borderTop}
        px-4 pt-7 pb-5 gap-0
        ${started ? '' : 'opacity-[0.88]'}
      `}
    >
      {!started && (
        <span className="absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wide text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">
          Not started
        </span>
      )}
      <span
        className={`absolute top-2.5 right-2.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${style.badge} whitespace-nowrap`}
      >
        {achievementTierPillText(a)}
      </span>

      <AchievementBadge
        percent={a.progressPercent}
        color={palette.color}
        lightColor={palette.light}
        isPlatinum={isPlatinum}
        Icon={Icon}
        size={108}
      />

      <h3 className="font-bold text-stone-800 text-xs leading-snug mt-3 px-1">{a.name}</h3>

      {a.id === 'max_apps_one_day' && (
        <p className="text-[10px] text-amber-700/90 font-medium leading-snug mt-1 px-1">{a.description}</p>
      )}
      {a.id === 'resilience' && (
        <p className="text-[10px] text-orange-800/85 font-medium leading-snug mt-1 px-1">{a.description}</p>
      )}

      <p className="text-[11px] text-stone-400 leading-snug mt-1 px-1">{microcopy}</p>

      <div className="flex flex-col items-center gap-0.5 mt-3">
        {countLabel && (
          <span className="text-[9px] font-semibold uppercase tracking-wide text-amber-800/80">{countLabel}</span>
        )}
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold text-stone-900 tabular-nums leading-none">{a.count}</span>
          <span className="text-stone-400 text-xs leading-none">
            {a.count === 1 ? a.unit : `${a.unit}s`}
          </span>
        </div>
      </div>

      <div className="mt-auto pt-3 w-full border-t border-stone-50">
        <p className={`text-[11px] font-medium ${isPlatinum ? 'text-violet-600' : 'text-stone-400'}`}>
          {nextLabel}
          {!isPlatinum && (
            <span className={`ml-1 font-bold ${style.accent}`}>{a.progressPercent}%</span>
          )}
        </p>
      </div>
    </div>
  );
}
