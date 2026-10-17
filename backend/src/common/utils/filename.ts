import * as path from 'path';

const MAX_NAME_LENGTH = 100;

/**
 * Reduces a client-supplied filename to a safe leaf name: no directory
 * components (either separator style), no control characters, only a
 * conservative character set, never empty and never a dot-file.
 */
export function sanitizeFilename(name: string): string {
  // Treat both separator styles as directory boundaries regardless of host OS.
  const leaf = path.posix.basename(String(name ?? '').replace(/\\/g, '/'));
  let safe = leaf
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[^A-Za-z0-9._ -]/g, '_')
    .replace(/^\.+/, '')
    .trim();
  if (safe.length > MAX_NAME_LENGTH) {
    const ext = path.extname(safe).slice(0, 16);
    safe = safe.slice(0, MAX_NAME_LENGTH - ext.length) + ext;
  }
  return safe || 'file';
}

/**
 * RFC 6266 `Content-Disposition` value. The quoted `filename` is a sanitised
 * ASCII fallback; `filename*` carries the percent-encoded UTF-8 original.
 * No raw quote, backslash or newline can reach the header.
 */
export function contentDisposition(
  filename: string,
  type: 'attachment' | 'inline' = 'attachment',
): string {
  const cleaned = String(filename ?? '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim();
  const fallback = sanitizeFilename(cleaned);
  const encoded = encodeURIComponent(cleaned || fallback).replace(
    /['()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `${type}; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}
