import {
  PointEvent,
  PointEventType,
  UserProgress,
  RANK_TIERS,
  POINT_VALUES,
  POINT_DESCRIPTIONS,
  DEDUPLICATED_EVENT_TYPES,
  RankTier,
} from './types';
import { db } from './db';
import { newId, now } from './utils';

export function getRank(totalPoints: number): RankTier {
  for (let i = RANK_TIERS.length - 1; i >= 0; i--) {
    if (totalPoints >= RANK_TIERS[i].minPoints) return RANK_TIERS[i];
  }
  return RANK_TIERS[0];
}

export function getNextRank(totalPoints: number): RankTier | null {
  const current = getRank(totalPoints);
  const idx = RANK_TIERS.findIndex((r) => r.name === current.name);
  return idx < RANK_TIERS.length - 1 ? RANK_TIERS[idx + 1] : null;
}

export function getRankProgress(totalPoints: number): {
  current: RankTier;
  next: RankTier | null;
  progressPercent: number;
  pointsToNext: number | null;
} {
  const current = getRank(totalPoints);
  const next = getNextRank(totalPoints);

  if (!next) {
    return { current, next: null, progressPercent: 100, pointsToNext: null };
  }

  const rangeStart = current.minPoints;
  const rangeEnd = next.minPoints;
  const progressInRange = totalPoints - rangeStart;
  const rangeSize = rangeEnd - rangeStart;
  const progressPercent = Math.min(100, Math.round((progressInRange / rangeSize) * 100));
  const pointsToNext = rangeEnd - totalPoints;

  return { current, next, progressPercent, pointsToNext };
}

function isCurrentWeek(dateStr: string): boolean {
  const date = new Date(dateStr);
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(today.getDate() - today.getDay());
  return date >= startOfWeek;
}

/**
 * Awards points for a user action. Returns true if points were awarded,
 * false if the event was blocked by deduplication or the user is not authenticated.
 */
export async function awardPoints(
  eventType: PointEventType,
  applicationId?: string,
  descriptionOverride?: string,
): Promise<boolean> {
  try {
    const events = await db.getPointEvents();

    // Block duplicate awards for one-time-per-application events
    if (DEDUPLICATED_EVENT_TYPES.includes(eventType) && applicationId) {
      const duplicate = events.some(
        (e) => e.eventType === eventType && e.applicationId === applicationId,
      );
      if (duplicate) return false;
    }

    const points = POINT_VALUES[eventType];

    const event: PointEvent = {
      id: newId(),
      applicationId,
      eventType,
      points,
      description: descriptionOverride ?? POINT_DESCRIPTIONS[eventType],
      createdAt: now(),
    };

    await db.addPointEvent(event);

    const progress = await db.getUserProgress();
    const ts = now();

    let weeklyPoints = progress.weeklyPoints;
    let weekStartDate = progress.weekStartDate;
    if (!isCurrentWeek(weekStartDate)) {
      weeklyPoints = 0;
      weekStartDate = ts;
    }

    const newTotal = progress.totalPoints + points;
    const newRank = getRank(newTotal);

    await db.saveUserProgress({
      ...progress,
      totalPoints: newTotal,
      currentRank: newRank.name,
      weeklyPoints: weeklyPoints + points,
      weekStartDate,
      lastActivityDate: ts,
      updatedAt: ts,
    });

    return true;
  } catch {
    return false;
  }
}
