import { createHmac, timingSafeEqual } from 'crypto';

export const IBINOLA_WEBHOOK_SIGNATURE_HEADER = 'X-AssetsUp-Signature';
export const IBINOLA_WEBHOOK_TIMESTAMP_HEADER = 'X-AssetsUp-Timestamp';
export const IBINOLA_WEBHOOK_SIGNATURE_PREFIX = 'sha256=';
export const DEFAULT_WEBHOOK_TOLERANCE_SECONDS = 300;

export interface SignedWebhookHeaders {
  [IBINOLA_WEBHOOK_SIGNATURE_HEADER]: string;
  [IBINOLA_WEBHOOK_TIMESTAMP_HEADER]: string;
}

export interface VerifyWebhookOptions {
  nowMs?: number;
  toleranceSeconds?: number;
}

function digest(secret: string, timestamp: string, payload: string): string {
  return createHmac('sha256', secret).update(`${timestamp}.${payload}`, 'utf8').digest('hex');
}

export function signWebhookDelivery(
  payload: string,
  secret: string,
  timestampMs: number = Date.now(),
): SignedWebhookHeaders {
  if (typeof payload !== 'string') throw new TypeError('payload must be a string');
  if (typeof secret !== 'string' || secret.length === 0) throw new TypeError('secret is required');
  const timestamp = String(Math.floor(timestampMs / 1000));
  return {
    [IBINOLA_WEBHOOK_SIGNATURE_HEADER]: `${IBINOLA_WEBHOOK_SIGNATURE_PREFIX}${digest(secret, timestamp, payload)}`,
    [IBINOLA_WEBHOOK_TIMESTAMP_HEADER]: timestamp,
  };
}

export function verifyWebhookDelivery(
  payload: string,
  signatureHeader: string | null | undefined,
  timestampHeader: string | null | undefined,
  secret: string,
  options: VerifyWebhookOptions = {},
): boolean {
  if (typeof payload !== 'string' || typeof secret !== 'string' || secret.length === 0) return false;
  if (typeof signatureHeader !== 'string' || typeof timestampHeader !== 'string') return false;
  if (!signatureHeader.startsWith(IBINOLA_WEBHOOK_SIGNATURE_PREFIX)) return false;

  const timestamp = Number(timestampHeader);
  if (!Number.isFinite(timestamp)) return false;

  const nowMs = options.nowMs ?? Date.now();
  const tolerance = options.toleranceSeconds ?? DEFAULT_WEBHOOK_TOLERANCE_SECONDS;
  if (Math.abs(Math.floor(nowMs / 1000) - timestamp) > tolerance) return false;

  const provided = signatureHeader.slice(IBINOLA_WEBHOOK_SIGNATURE_PREFIX.length);
  const expected = digest(secret, timestampHeader, payload);
  const providedBuf = Buffer.from(provided, 'hex');
  const expectedBuf = Buffer.from(expected, 'hex');
  if (providedBuf.length !== expectedBuf.length || providedBuf.length === 0) return false;
  return timingSafeEqual(providedBuf, expectedBuf);
}
