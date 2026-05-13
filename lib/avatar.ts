/** Max upload size for profile pictures (5 MB). */
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp']);

/** File extension (no dot) for storage key — jpeg normalized to jpg. */
export function avatarFileExtension(file: File): 'png' | 'jpg' | 'webp' | null {
  const mime = (file.type || '').toLowerCase().split(';')[0].trim();
  const name = (file.name || '').toLowerCase();
  if (mime === 'image/png' || name.endsWith('.png')) return 'png';
  if (mime === 'image/jpeg' || name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'jpg';
  if (mime === 'image/webp' || name.endsWith('.webp')) return 'webp';
  return null;
}

export function validateAvatarFile(file: File): string | null {
  if (file.size > AVATAR_MAX_BYTES) {
    return `Image must be at most ${AVATAR_MAX_BYTES / (1024 * 1024)} MB.`;
  }
  const ext = avatarFileExtension(file);
  if (!ext) return 'Use a PNG, JPG, or WebP image.';
  const mime = (file.type || '').toLowerCase().split(';')[0].trim();
  if (mime && !ALLOWED_MIME.has(mime)) return 'Use a PNG, JPG, or WebP image.';
  return null;
}

export function avatarInitials(p: {
  fullName: string;
  displayName?: string | null;
  username?: string | null;
}): string {
  const d = p.displayName?.trim();
  if (d) return takeTwo(d);
  const f = p.fullName?.trim();
  if (f) return takeTwo(f);
  const u = p.username?.trim();
  if (u) return u.slice(0, 2).toUpperCase();
  return '?';
}

function takeTwo(s: string): string {
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase() || '?';
  }
  const one = parts[0] ?? s;
  return one.slice(0, 2).toUpperCase() || '?';
}

const FALLBACK_GRADIENTS = [
  'from-violet-500 to-fuchsia-600',
  'from-sky-500 to-indigo-600',
  'from-amber-500 to-orange-600',
  'from-emerald-500 to-teal-600',
  'from-rose-500 to-pink-600',
  'from-blue-500 to-violet-600',
] as const;

export function avatarFallbackGradientClass(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return FALLBACK_GRADIENTS[h % FALLBACK_GRADIENTS.length];
}
