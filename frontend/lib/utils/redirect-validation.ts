/**
 * Validates a redirect URL to prevent open-redirect attacks.
 * Only same-origin relative paths are allowed.
 *
 * Rules:
 * - Must start with a single "/"
 * - Must not start with "//" (protocol-relative)
 * - Must not contain backslashes
 * - Must not contain a scheme (e.g. "https:", "http:")
 * - Falls back to "/dashboard" if invalid
 */
export function getSafeRedirect(redirect: string | null): string {
  const fallback = '/dashboard';

  if (!redirect) return fallback;

  // Reject anything that doesn't start with "/"
  if (!redirect.startsWith('/')) return fallback;

  // Reject protocol-relative URLs ("//evil.example")
  if (redirect.startsWith('//')) return fallback;

  // Reject backslashes (e.g. "\evil.example" or "/\evil.example")
  if (redirect.includes('\\')) return fallback;

  // Reject encoded variants that decode to a scheme or protocol-relative path
  const decoded = decodeURIComponent(redirect);
  if (decoded.includes('://')) return fallback;
  if (decoded.startsWith('//')) return fallback;

  // Reject any scheme prefix (e.g. "javascript:", "data:")
  if (/[a-zA-Z][a-zA-Z0-9+.-]*:/.test(redirect.split('/')[0])) return fallback;

  return redirect;
}