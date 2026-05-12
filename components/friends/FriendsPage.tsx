'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Search,
  UserPlus,
  Users,
  Flame,
  Trophy,
  Sparkles,
  Zap,
  X,
  Check,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import type { Friendship, IncomingFriendPreview, PublicFriendCard, PublicFriendSearchResult } from '@/lib/types';
import { publicDisplayLabel } from '@/lib/public-profile';
import { formatUsernameAt, normalizeUsername, validateUsername } from '@/lib/username';
import { useMobileNav } from '@/lib/mobile-nav';
import FriendProfileModal from '@/components/friends/FriendProfileModal';

function rankBadgeClass(rank: string): string {
  const r = rank.toLowerCase();
  if (r.includes('offer')) return 'from-emerald-400 to-teal-500';
  if (r.includes('interview')) return 'from-amber-400 to-orange-500';
  if (r.includes('locked')) return 'from-violet-500 to-fuchsia-500';
  if (r.includes('rise')) return 'from-sky-400 to-blue-600';
  return 'from-slate-400 to-slate-600';
}

export default function FriendsPage() {
  const { user, profile, refreshProfile } = useAuth();
  const { setTab } = useMobileNav();
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<PublicFriendSearchResult[]>([]);
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [cards, setCards] = useState<PublicFriendCard[]>([]);
  const [incomingPreviews, setIncomingPreviews] = useState<IncomingFriendPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailCard, setDetailCard] = useState<PublicFriendCard | null>(null);

  const hasUsername = !!(profile?.username?.trim());

  const reload = useCallback(async () => {
    const [f, c] = await Promise.all([db.listFriendships(), db.getAcceptedFriendPublicCards()]);
    setFriendships(f);
    setCards(c);
    try {
      const inc = await db.listIncomingFriendRequestPreviews();
      setIncomingPreviews(inc);
    } catch {
      setIncomingPreviews([]);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await reload();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [reload]);

  const cardByUserId = useMemo(() => new Map(cards.map((c) => [c.userId, c])), [cards]);

  const outgoing = useMemo(
    () => friendships.filter((f) => f.status === 'pending' && f.requesterId === user?.id),
    [friendships, user?.id],
  );

  const acceptedRows = useMemo(() => {
    if (!user) return [];
    return friendships
      .filter((f) => f.status === 'accepted')
      .map((f) => {
        const otherId = f.requesterId === user.id ? f.receiverId : f.requesterId;
        return { friendship: f, card: cardByUserId.get(otherId) };
      });
  }, [friendships, user, cardByUserId]);

  function relationToTarget(targetId: string): 'accepted' | 'pending_out' | 'pending_in' | null {
    for (const f of friendships) {
      if (f.status === 'declined' || f.status === 'blocked') continue;
      const other = f.requesterId === user?.id ? f.receiverId : f.requesterId;
      if (other !== targetId) continue;
      if (f.status === 'accepted') return 'accepted';
      if (f.status === 'pending' && f.requesterId === user?.id) return 'pending_out';
      if (f.status === 'pending' && f.receiverId === user?.id) return 'pending_in';
    }
    return null;
  }

  async function runSearch() {
    const q = normalizeUsername(search);
    setFormError('');
    if (!hasUsername) {
      setFormError('Set a username in Profile to use Friends.');
      return;
    }
    const v = validateUsername(q);
    if (v) {
      setFormError(v);
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const rows = await db.searchProfilesByUsername(q);
      setResults(rows);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Search failed.');
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function addFriend(targetId: string) {
    setActionId(targetId);
    setFormError('');
    try {
      await db.sendFriendRequest(targetId);
      await reload();
      await refreshProfile();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Could not send request.');
    } finally {
      setActionId(null);
    }
  }

  async function respond(id: string, status: 'accepted' | 'declined') {
    setActionId(id);
    try {
      await db.respondToFriendRequest(id, status);
      await reload();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Could not update request.');
    } finally {
      setActionId(null);
    }
  }

  async function removeFriend(friendshipId: string) {
    setActionId(friendshipId);
    try {
      await db.deleteFriendship(friendshipId);
      await reload();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Could not remove friend.');
    } finally {
      setActionId(null);
    }
  }

  async function cancelOutgoing(friendshipId: string) {
    setActionId(friendshipId);
    try {
      await db.deleteFriendship(friendshipId);
      await reload();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Could not cancel.');
    } finally {
      setActionId(null);
    }
  }

  function openFriendDetail(c: PublicFriendCard) {
    setDetailCard(c);
    setDetailOpen(true);
  }

  function closeFriendDetail() {
    setDetailOpen(false);
    setDetailCard(null);
  }

  if (!profile || !user) return null;

  return (
    <div className="min-h-full bg-gradient-to-b from-violet-50/40 via-stone-50 to-fuchsia-50/30 pb-24 md:pb-10">
      <div className="max-w-3xl mx-auto px-4 md:px-8 pt-6 md:pt-10">
        <Link
          href="/"
          onClick={() => setTab('home')}
          className="md:hidden inline-flex items-center gap-1.5 text-stone-500 hover:text-violet-600 text-sm font-medium mb-4"
        >
          <ArrowLeft size={14} /> Home
        </Link>

        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
              <Users className="text-white" size={22} strokeWidth={2.25} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-stone-900 tracking-tight">Friends</h1>
              <p className="text-sm text-stone-500 mt-0.5">
                Squad up, stay accountable, flex the grind — safely.
              </p>
            </div>
          </div>
        </header>

        {!hasUsername && (
          <div className="mb-6 rounded-2xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 shadow-sm">
            <p className="font-semibold text-amber-900">Pick a username to unlock Friends</p>
            <p className="text-amber-800/90 mt-1">
              Your job details never leave your account. Friends only see rank, points, streaks, and achievements.
            </p>
            <Link
              href="/profile"
              className="inline-flex mt-3 text-sm font-semibold text-violet-700 hover:text-violet-900"
            >
              Go to Profile →
            </Link>
          </div>
        )}

        {hasUsername && (
          <section className="mb-8 rounded-2xl border border-white/80 bg-white/70 backdrop-blur-md shadow-sm shadow-violet-500/5 p-4 md:p-5">
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-stone-400 mb-2">
              <Search size={14} /> Find by username
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">@</span>
                <input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setFormError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && runSearch()}
                  placeholder="griffinboyle"
                  className="w-full rounded-xl border border-stone-200 bg-white pl-8 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
              </div>
              <button
                type="button"
                onClick={runSearch}
                disabled={searching}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-500/20 hover:from-violet-700 hover:to-fuchsia-700 disabled:opacity-50"
              >
                {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                Search
              </button>
            </div>
            {formError && (
              <p className="text-xs text-red-600 mt-2 font-medium">{formError}</p>
            )}
            {results.length > 0 && (
              <ul className="mt-4 space-y-2">
                {results.map((r) => {
                  const rel = relationToTarget(r.id);
                  const busy = actionId === r.id;
                  return (
                    <li
                      key={r.id}
                      className="flex flex-wrap items-center gap-3 rounded-xl border border-stone-100 bg-stone-50/80 px-3 py-3"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-stone-800 truncate">
                          {publicDisplayLabel({ displayName: r.displayName, fullName: r.fullName })}
                        </p>
                        <p className="text-xs text-violet-600 font-medium">{formatUsernameAt(r.username)}</p>
                        <p className="text-xs text-stone-500 mt-0.5">
                          Rank <span className="text-stone-700 font-medium">{r.currentRank}</span>
                          {' · '}
                          {r.totalPoints} pts
                        </p>
                      </div>
                      {rel === 'accepted' && (
                        <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">Friends</span>
                      )}
                      {rel === 'pending_out' && (
                        <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded-lg">Sent</span>
                      )}
                      {rel === 'pending_in' && (
                        <span className="text-xs font-semibold text-sky-700 bg-sky-50 px-2 py-1 rounded-lg">Wants to connect</span>
                      )}
                      {!rel && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => addFriend(r.id)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-violet-200 text-violet-700 text-xs font-semibold px-3 py-2 hover:bg-violet-50 disabled:opacity-50"
                        >
                          {busy ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                          Add Friend
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}

        {incomingPreviews.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-bold text-stone-800 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Sparkles size={16} className="text-fuchsia-500" />
              Incoming
            </h2>
            <ul className="space-y-2">
              {incomingPreviews.map((req) => (
                <li
                  key={req.friendshipId}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-fuchsia-100 bg-white/80 px-4 py-3 shadow-sm"
                >
                  <div>
                    <p className="font-semibold text-stone-800">
                      {publicDisplayLabel({ displayName: req.displayName, fullName: req.fullName })}
                    </p>
                    {req.username?.trim() ? (
                      <p className="text-xs text-violet-600 font-medium">{formatUsernameAt(req.username)}</p>
                    ) : null}
                    <p className="text-xs text-stone-500 mt-1">
                      {req.currentRank} · {req.totalPoints} pts
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={actionId === req.friendshipId}
                      onClick={() => respond(req.friendshipId, 'accepted')}
                      className="inline-flex items-center gap-1 rounded-xl bg-emerald-500 text-white text-xs font-semibold px-3 py-2 hover:bg-emerald-600 disabled:opacity-50"
                    >
                      {actionId === req.friendshipId ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                      Accept
                    </button>
                    <button
                      type="button"
                      disabled={actionId === req.friendshipId}
                      onClick={() => respond(req.friendshipId, 'declined')}
                      className="inline-flex items-center gap-1 rounded-xl border border-stone-200 text-stone-600 text-xs font-semibold px-3 py-2 hover:bg-stone-50 disabled:opacity-50"
                    >
                      <X size={14} />
                      Decline
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {outgoing.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-bold text-stone-800 uppercase tracking-wide mb-3">Outgoing</h2>
            <ul className="space-y-2">
              {outgoing.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center justify-between rounded-xl border border-stone-100 bg-white/70 px-3 py-2 text-sm text-stone-600"
                >
                  <span>Request pending…</span>
                  <button
                    type="button"
                    disabled={actionId === f.id}
                    onClick={() => cancelOutgoing(f.id)}
                    className="text-xs font-semibold text-stone-500 hover:text-rose-600 disabled:opacity-50"
                  >
                    {actionId === f.id ? '…' : 'Cancel'}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h2 className="text-sm font-bold text-stone-800 uppercase tracking-wide mb-3 flex items-center gap-2">
            <Trophy size={16} className="text-amber-500" />
            Your crew
          </h2>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-violet-500" size={28} />
            </div>
          ) : acceptedRows.length === 0 ? (
            <p className="text-sm text-stone-500 rounded-2xl border border-dashed border-stone-200 bg-white/50 px-4 py-8 text-center">
              No friends yet — search above and send your first request.
            </p>
          ) : (
            <ul className="space-y-4">
              {acceptedRows.map(({ friendship, card }) => (
                <li
                  key={friendship.id}
                  className="rounded-2xl border border-white/90 bg-white/90 backdrop-blur-sm shadow-md shadow-violet-500/10 overflow-hidden"
                >
                  {card ? (
                    <>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => openFriendDetail(card)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            openFriendDetail(card);
                          }
                        }}
                        className="w-full text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-400/90 transition-colors hover:bg-stone-50/50"
                      >
                        <div className={`px-4 py-3 bg-gradient-to-r ${rankBadgeClass(card.currentRank)} text-white`}>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-bold text-lg leading-tight">
                                {publicDisplayLabel({ displayName: card.displayName, fullName: card.fullName })}
                              </p>
                              <p className="text-white/90 text-sm font-medium">{formatUsernameAt(card.username)}</p>
                            </div>
                            <span className="shrink-0 rounded-full bg-white/20 px-2.5 py-1 text-xs font-bold uppercase tracking-wide">
                              {card.currentRank}
                            </span>
                          </div>
                        </div>
                        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                          <StatPill icon={Trophy} label="Points" value={card.totalPoints} accent="text-amber-600" />
                          <StatPill icon={Sparkles} label="Achievements" value={card.achievementsUnlockedCount} accent="text-fuchsia-600" />
                          <StatPill icon={Flame} label="Current streak" value={`${card.currentStreak}d`} accent="text-orange-600" />
                          <StatPill icon={Flame} label="Best streak" value={`${card.longestStreak}d`} accent="text-rose-600" />
                          <StatPill icon={Zap} label="Most in one day" value={card.maxAppsOneDay} accent="text-sky-600" />
                        </div>
                        <p className="text-center text-[11px] text-stone-400 pb-3 px-4 font-medium">
                          Tap to view achievement badges
                        </p>
                      </div>
                      <div className="px-4 pb-4 pt-1 flex justify-end border-t border-stone-100/80">
                        <button
                          type="button"
                          disabled={actionId === friendship.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFriend(friendship.id);
                          }}
                          className="text-xs font-semibold text-stone-400 hover:text-rose-600 disabled:opacity-50"
                        >
                          {actionId === friendship.id ? 'Removing…' : 'Remove friend'}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="p-4 text-sm text-stone-500">
                      Friend profile is updating — only public stats are shown here.
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <FriendProfileModal open={detailOpen} onClose={closeFriendDetail} card={detailCard} />
    </div>
  );
}

function StatPill({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Trophy;
  label: string;
  value: string | number;
  accent: string;
}) {
  return (
    <div className="rounded-xl bg-stone-50 border border-stone-100 px-3 py-2.5">
      <div className={`flex items-center gap-1.5 text-xs font-semibold ${accent}`}>
        <Icon size={14} strokeWidth={2.25} />
        {label}
      </div>
      <p className="text-lg font-bold text-stone-900 tabular-nums mt-1">{value}</p>
    </div>
  );
}
