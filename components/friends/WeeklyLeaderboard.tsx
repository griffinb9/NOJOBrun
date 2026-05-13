'use client';

import { ListOrdered } from 'lucide-react';
import type { WeeklyAppsLeaderboardEntry } from '@/lib/types';
import { publicDisplayLabel } from '@/lib/public-profile';
import { formatUsernameAt } from '@/lib/username';

export type RankedWeeklyEntry = WeeklyAppsLeaderboardEntry & { displayRank: number };

function rankBadgeClass(rank: string): string {
  const r = rank.toLowerCase();
  if (r.includes('offer')) return 'from-emerald-400 to-teal-500';
  if (r.includes('interview')) return 'from-amber-400 to-orange-500';
  if (r.includes('locked')) return 'from-violet-500 to-fuchsia-500';
  if (r.includes('rise')) return 'from-sky-400 to-blue-600';
  return 'from-slate-400 to-slate-600';
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('') || '?';
}

interface Props {
  loading: boolean;
  weekLabel: string;
  ranked: RankedWeeklyEntry[];
  currentUserId: string;
  noFriends: boolean;
  noAppsThisWeek: boolean;
}

export default function WeeklyLeaderboard({
  loading,
  weekLabel,
  ranked,
  currentUserId,
  noFriends,
  noAppsThisWeek,
}: Props) {
  if (noFriends) {
    return (
      <section className="mb-8 rounded-2xl border border-violet-100 bg-white/80 p-5 shadow-sm shadow-violet-500/5 backdrop-blur-md">
        <h2 className="text-sm font-bold text-stone-800 uppercase tracking-wide mb-2 flex items-center gap-2">
          <ListOrdered size={16} className="text-violet-500" />
          Weekly Leaderboard
        </h2>
        <p className="text-sm text-stone-600 leading-relaxed">
          Add friends to compete on the weekly leaderboard.
        </p>
      </section>
    );
  }

  return (
    <section className="mb-8 rounded-2xl border border-violet-100 bg-white/80 shadow-sm shadow-violet-500/5 backdrop-blur-md overflow-hidden">
      <div className="border-b border-stone-100/90 bg-gradient-to-r from-violet-50/90 via-white to-fuchsia-50/40 px-4 py-4 md:px-5">
        <h2 className="text-sm font-bold text-stone-800 uppercase tracking-wide flex items-center gap-2">
          <ListOrdered size={16} className="text-violet-500" />
          Weekly Leaderboard
        </h2>
        <p className="text-xs text-stone-500 mt-1">Applications this week · {weekLabel}</p>
      </div>

      {noAppsThisWeek && !loading && (
        <p className="text-sm text-stone-600 px-4 py-3 md:px-5 bg-amber-50/50 border-b border-amber-100/80">
          No applications logged yet this week.
        </p>
      )}

      <div className="overflow-x-auto">
        {loading ? (
          <div className="flex justify-center py-10 text-stone-400 text-sm">Loading leaderboard…</div>
        ) : (
          <table className="w-full min-w-[320px] text-left text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-stone-400 border-b border-stone-100">
                <th className="pl-4 md:pl-5 py-2.5 font-semibold w-12">#</th>
                <th className="py-2.5 font-semibold">Member</th>
                <th className="py-2.5 font-semibold text-right pr-4 md:pr-5">Apps</th>
                <th className="py-2.5 font-semibold pr-4 md:pr-5 hidden sm:table-cell">Rank</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((row) => {
                const isYou = row.userId === currentUserId;
                const label = publicDisplayLabel({ displayName: row.displayName, fullName: row.fullName });
                const handle = row.username?.trim() ? formatUsernameAt(row.username) : null;
                return (
                  <tr
                    key={row.userId}
                    className={`border-b border-stone-50 last:border-0 transition-colors ${
                      isYou
                        ? 'bg-violet-50/90 ring-1 ring-inset ring-violet-200/80'
                        : 'hover:bg-stone-50/80'
                    }`}
                  >
                    <td className="pl-4 md:pl-5 py-3 font-black tabular-nums text-stone-700">
                      {row.displayRank}
                    </td>
                    <td className="py-3 pr-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`shrink-0 flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white bg-gradient-to-br shadow-inner ${rankBadgeClass(row.currentRank)}`}
                          aria-hidden
                        >
                          {initials(label)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-stone-900 truncate">
                            {label}
                            {isYou && (
                              <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wide text-violet-600">
                                You
                              </span>
                            )}
                          </p>
                          {handle ? (
                            <p className="text-xs text-violet-600 font-medium truncate">{handle}</p>
                          ) : (
                            <p className="text-xs text-stone-400">No @username</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-right pr-4 md:pr-5 font-bold tabular-nums text-stone-900">
                      {row.appsThisWeek}
                    </td>
                    <td className="py-3 pr-4 md:pr-5 hidden sm:table-cell">
                      <span
                        className={`inline-flex rounded-full bg-gradient-to-r px-2 py-0.5 text-[10px] font-bold text-white shadow-sm ${rankBadgeClass(row.currentRank)}`}
                      >
                        {row.currentRank}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
