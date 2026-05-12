/** Normalized handle: lowercase, trimmed (no @ prefix). */
export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

const USERNAME_RE = /^[a-z0-9_.]{3,20}$/;

export function validateUsername(normalized: string): string | null {
  if (!normalized) return 'Username is required.';
  if (normalized.length < 3 || normalized.length > 20) {
    return 'Username must be 3–20 characters.';
  }
  if (!USERNAME_RE.test(normalized)) {
    return 'Use only lowercase letters, numbers, underscores, and periods. No spaces.';
  }
  return null;
}

export function formatUsernameAt(normalized: string): string {
  return normalized ? `@${normalized}` : '';
}
