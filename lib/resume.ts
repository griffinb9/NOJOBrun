/** Shared resume text limits and sanitization (Supabase + AI context). */

export const RESUME_MAX_CHARS = 15000;

/** Shown when DOCX/PDF extraction fails or the file cannot be read. */
export const RESUME_UPLOAD_READ_ERROR =
  "We couldn't read this file. Please try another format or paste your resume text.";

export const RESUME_TXT_MAX_BYTES = 5 * 1024 * 1024;

export function fileExtensionLower(name: string): string {
  const n = name.trim().toLowerCase();
  const i = n.lastIndexOf('.');
  return i >= 0 ? n.slice(i) : '';
}

export function stripResumeHtml(text: string): string {
  return text.replace(/<[^>]*>/g, '');
}

export function sanitizeResumeText(text: string): string {
  return stripResumeHtml(text).replace(/\0/g, '').trim().slice(0, RESUME_MAX_CHARS);
}
