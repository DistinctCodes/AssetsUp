import { createHmac } from 'crypto';

export const SIGNATURE_ALGORITHM = 'sha256';
export const SIGNATURE_PREFIX = `${SIGNATURE_ALGORITHM}=`;

export function signPayload(payload: string, secret: string): string {
  return `${SIGNATURE_PREFIX}${createHmac(SIGNATURE_ALGORITHM, secret)
    .update(payload, 'utf8')
    .digest('hex')}`;
}

export function parseSignatureHeader(header: string | null | undefined): string | null {
  if (typeof header !== 'string') return null;
  const first = header.split(',')[0].trim();
  if (!first.toLowerCase().startsWith(SIGNATURE_PREFIX)) return null;
  const digest = first.slice(SIGNATURE_PREFIX.length).trim().toLowerCase();
  return /^[0-9a-f]{64}$/.test(digest) ? digest : null;
}

export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) {
    difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return difference === 0;
}

export function verifySignature(
  payload: string,
  header: string | null | undefined,
  secret: string,
): boolean {
  if (typeof payload !== 'string' || typeof secret !== 'string' || secret.length === 0) {
    return false;
  }
  const provided = parseSignatureHeader(header);
  if (provided === null) return false;
  return constantTimeEqual(provided, signPayload(payload, secret).slice(SIGNATURE_PREFIX.length));
}
