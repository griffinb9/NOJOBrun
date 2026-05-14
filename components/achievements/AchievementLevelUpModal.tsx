'use client';

import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import {
  Send, PhoneCall, Mic, Trophy, MailCheck, Sparkles, BookOpen, Zap, Shield, Star,
} from 'lucide-react';
import type { AchievementNotification } from '@/lib/types';
import {
  formatTierNameDisplay,
  getAchievementDefById,
  PREFIRST_TIER_TOKEN,
} from '@/lib/achievements';
import AchievementBadge from '@/components/ui/AchievementBadge';

const ICONS: Record<string, LucideIcon> = {
  jobs_applied: Send,
  max_apps_one_day: Zap,
  recruiter_screens: PhoneCall,
  interviews: Mic,
  offers: Trophy,
  follow_ups: MailCheck,
  resilience: Shield,
  prep_kits: Sparkles,
  star_stories: BookOpen,
};

const PALETTE: Record<string, { color: string; light: string }> = {
  jobs_applied: { color: '#3B82F6', light: '#60A5FA' },
  max_apps_one_day: { color: '#D97706', light: '#FBBF24' },
  recruiter_screens: { color: '#8B5CF6', light: '#A78BFA' },
  interviews: { color: '#F43F5E', light: '#FB7185' },
  offers: { color: '#10B981', light: '#34D399' },
  follow_ups: { color: '#F59E0B', light: '#FCD34D' },
  resilience: { color: '#DC2626', light: '#FB923C' },
  prep_kits: { color: '#7C3AED', light: '#A78BFA' },
  star_stories: { color: '#14B8A6', light: '#2DD4BF' },
};

function tierLabel(token: string): string {
  if (token === PREFIRST_TIER_TOKEN) return 'your starting path';
  return formatTierNameDisplay(token);
}

const SPARKLE_SEEDS = [12, 28, 44, 58, 72, 18, 65, 38, 82, 22, 55, 91];

interface Props {
  notif: AchievementNotification;
  onContinue: () => void;
}

export default function AchievementLevelUpModal({ notif, onContinue }: Props) {
  const def = getAchievementDefById(notif.achievementKey);
  const name = def?.name ?? notif.achievementKey;
  const Icon = ICONS[notif.achievementKey] ?? Star;
  const palette = PALETTE[notif.achievementKey] ?? { color: '#7C3AED', light: '#A78BFA' };
  const newRoman = formatTierNameDisplay(notif.newTier);
  const isPlatinum = def ? def.tiers[def.tiers.length - 1]?.name === notif.newTier : false;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-stone-900/55 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="level-up-title"
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 12 }}
        transition={{ type: 'spring', stiffness: 420, damping: 28 }}
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-b from-stone-900 via-violet-950 to-stone-950 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_24px_80px_-12px_rgba(99,102,241,0.45),0_0_120px_-20px_rgba(236,72,153,0.25)]"
      >
        {/* Sparkles */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {SPARKLE_SEEDS.map((left, i) => (
            <span
              key={i}
              className="absolute h-1 w-1 rounded-full bg-amber-200/90 shadow-[0_0_8px_2px_rgba(251,191,36,0.6)] animate-ping"
              style={{
                left: `${left}%`,
                top: `${(i * 17 + 7) % 88}%`,
                animationDuration: `${1.8 + (i % 4) * 0.35}s`,
                animationDelay: `${i * 0.12}s`,
              }}
            />
          ))}
        </div>

        <div className="relative px-8 pt-10 pb-8 text-center">
          <p id="level-up-title" className="text-xs font-bold uppercase tracking-[0.2em] text-amber-200/90 mb-2">
            Congratulations!
          </p>
          <p className="text-lg font-semibold text-white/95 leading-snug">
            You leveled up your{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-fuchsia-200 font-bold">
              {name}
            </span>{' '}
            badge
          </p>

          <div className="flex justify-center my-8">
            <div className="relative">
              <div
                className="absolute inset-0 rounded-full blur-2xl scale-110 opacity-80"
                style={{ background: `radial-gradient(circle, ${palette.color}66 0%, transparent 70%)` }}
              />
              <div className="relative rounded-full p-0.5 ring-2 ring-white/25 ring-offset-4 ring-offset-stone-900/0">
                <AchievementBadge
                  percent={100}
                  color={palette.color}
                  lightColor={palette.light}
                  isPlatinum={isPlatinum}
                  Icon={Icon}
                  size={132}
                />
              </div>
            </div>
          </div>

          <p className="text-sm text-white/70 mb-1">New tier</p>
          <p className="text-3xl font-black tracking-tight text-white drop-shadow-[0_0_28px_rgba(167,139,250,0.45)]">
            {newRoman}
          </p>
          {notif.oldTier !== PREFIRST_TIER_TOKEN && (
            <p className="text-[11px] text-white/40 mt-2">
              Up from {tierLabel(notif.oldTier)}
            </p>
          )}

          <button
            type="button"
            onClick={onContinue}
            className="mt-10 w-full rounded-2xl bg-gradient-to-r from-amber-400 via-fuchsia-500 to-violet-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-900/40 hover:brightness-110 active:scale-[0.98] transition-all"
          >
            Awesome
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
