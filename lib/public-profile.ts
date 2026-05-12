/** First name or display line for friends / search (never exposes email). */
export function publicDisplayLabel(p: { displayName?: string | null; fullName: string }): string {
  const d = p.displayName?.trim();
  if (d) return d;
  const first = p.fullName?.trim().split(/\s+/)[0];
  return first || 'Member';
}
