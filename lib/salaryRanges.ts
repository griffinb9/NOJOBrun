/**
 * Canonical salary range strings stored in `applications.salary` / `Job.salary`.
 * Empty string means "Not listed".
 */
export const SALARY_RANGE_OPTIONS: readonly { value: string; label: string }[] = [
  { value: '', label: 'Not listed' },
  { value: 'Under $40,000', label: 'Under $40,000' },
  { value: '$40,000 - $49,999', label: '$40,000 - $49,999' },
  { value: '$50,000 - $59,999', label: '$50,000 - $59,999' },
  { value: '$60,000 - $69,999', label: '$60,000 - $69,999' },
  { value: '$70,000 - $79,999', label: '$70,000 - $79,999' },
  { value: '$80,000 - $89,999', label: '$80,000 - $89,999' },
  { value: '$90,000 - $99,999', label: '$90,000 - $99,999' },
  { value: '$100,000 - $124,999', label: '$100,000 - $124,999' },
  { value: '$125,000 - $149,999', label: '$125,000 - $149,999' },
  { value: '$150,000+', label: '$150,000+' },
] as const;

const PRESET_VALUES = new Set(SALARY_RANGE_OPTIONS.map((o) => o.value));

export function isPresetSalaryValue(value: string | undefined | null): boolean {
  return PRESET_VALUES.has(value ?? '');
}

/** Build `<select>` options: presets plus one row for non-matching stored text (import / legacy). */
export function salarySelectOptions(stored: string | undefined | null): { value: string; label: string }[] {
  const raw = stored ?? '';
  if (PRESET_VALUES.has(raw)) return [...SALARY_RANGE_OPTIONS];
  const t = raw.trim();
  if (!t) return [...SALARY_RANGE_OPTIONS];
  if (PRESET_VALUES.has(t)) return [...SALARY_RANGE_OPTIONS];
  const preview = t.length > 44 ? `${t.slice(0, 41)}…` : t;
  return [
    ...SALARY_RANGE_OPTIONS,
    { value: t, label: `Custom / existing: ${preview}` },
  ];
}

export function salaryFromImportCell(raw: string | undefined | null): string | undefined {
  const t = (raw ?? '').trim();
  if (!t) return undefined;
  return t;
}

/** Normalize loaded job salary for the form (trim; known presets stay canonical). */
export function coerceLoadedSalaryForForm(s: string | undefined | null): string {
  const t = (s ?? '').trim();
  if (!t) return '';
  if (PRESET_VALUES.has(t)) return t;
  return t;
}
