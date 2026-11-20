export interface DocumentUrlValidation {
  ok: boolean;
  reason?: string;
  normalizedUrl?: string;
}

const ALLOWED_PROTOCOLS = new Set(['https:']);

export function validateDocumentUrl(
  input: string | null | undefined,
  options: { allowedHosts?: string[] } = {},
): DocumentUrlValidation {
  if (typeof input !== 'string' || input.trim().length === 0) {
    return { ok: false, reason: 'fileUrl is required' };
  }
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return { ok: false, reason: 'fileUrl must be a valid absolute URL' };
  }

  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    return { ok: false, reason: `Protocol ${url.protocol} is not allowed` };
  }
  const hostname = url.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.local')) {
    return { ok: false, reason: 'Internal/local URLs are not allowed' };
  }
  if (options.allowedHosts && options.allowedHosts.length > 0) {
    const allowed = options.allowedHosts.map((h) => h.toLowerCase());
    if (!allowed.includes(hostname)) {
      return { ok: false, reason: 'Host is not in allow list' };
    }
  }
  return { ok: true, normalizedUrl: url.toString() };
}
