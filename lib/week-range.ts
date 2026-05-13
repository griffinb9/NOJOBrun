/**
 * Monday-start calendar week in the browser's local timezone.
 * Used for weekly leaderboards (aligned with user expectations).
 */
export function getBrowserLocalWeekDateBounds(reference = new Date()): {
  weekStart: string;
  weekEnd: string;
  timeZone: string;
} {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const d = new Date(reference);
  const day = d.getDay(); // 0 Sun … 6 Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diffToMonday);
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);

  const fmt = (x: Date) => {
    const y = x.getFullYear();
    const m = String(x.getMonth() + 1).padStart(2, '0');
    const da = String(x.getDate()).padStart(2, '0');
    return `${y}-${m}-${da}`;
  };

  return {
    weekStart: fmt(monday),
    weekEnd: fmt(sunday),
    timeZone,
  };
}

/** e.g. "Jan 6 – Jan 12, 2026" in local locale */
export function formatWeekRangeLabel(weekStart: string, weekEnd: string): string {
  const a = new Date(`${weekStart}T12:00:00`);
  const b = new Date(`${weekEnd}T12:00:00`);
  const sameYear = a.getFullYear() === b.getFullYear();
  const optsStart: Intl.DateTimeFormatOptions = sameYear
    ? { month: 'short', day: 'numeric' }
    : { month: 'short', day: 'numeric', year: 'numeric' };
  const optsEnd: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  return `${a.toLocaleDateString(undefined, optsStart)} – ${b.toLocaleDateString(undefined, optsEnd)}`;
}
