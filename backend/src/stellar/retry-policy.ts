export const RETRYABLE_ERROR_CODES = [
  'ECONNRESET',
  'ECONNREFUSED',
  'ECONNABORTED',
  'ETIMEDOUT',
  'EAI_AGAIN',
  'ENOTFOUND',
  'EPIPE',
  'ENETUNREACH',
  'EHOSTUNREACH',
] as const;

export const DEFAULT_MAX_ATTEMPTS = 3;
export const DEFAULT_BASE_DELAY_MS = 100;
export const DEFAULT_MAX_DELAY_MS = 5_000;
export const DEFAULT_FACTOR = 2;
export const DEFAULT_JITTER = 0.2;

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  factor?: number;
  jitter?: number;
  isRetryable?: (error: unknown) => boolean;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
}

export function errorCode(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : null;
}

export function isRetryableError(error: unknown): boolean {
  const code = errorCode(error);
  if (code !== null && (RETRYABLE_ERROR_CODES as readonly string[]).includes(code)) {
    return true;
  }
  const message =
    typeof error === 'object' && error !== null
      ? (error as { message?: unknown }).message
      : undefined;
  return typeof message === 'string' && /timeout|timed out|ECONNRESET|socket hang up/i.test(message);
}

export function computeBackoffDelayMs(
  attempt: number,
  options: RetryOptions = {},
): number {
  const base = options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  const factor = options.factor ?? DEFAULT_FACTOR;
  const max = options.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;
  const jitter = options.jitter ?? DEFAULT_JITTER;
  const safeAttempt = Number.isFinite(attempt) && attempt > 0 ? Math.floor(attempt) : 1;
  const raw = base * Math.pow(factor, safeAttempt - 1);
  const capped = Math.min(max, raw);
  if (!jitter) return capped;
  const random = options.random ? options.random() : Math.random();
  const clampedRandom = Math.min(1, Math.max(0, random));
  const spread = Math.max(0, 1 - jitter + jitter * clampedRandom);
  return Math.max(0, Math.round(capped * spread));
}

export function shouldRetry(
  attempt: number,
  error: unknown,
  options: RetryOptions = {},
): boolean {
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  if (attempt >= maxAttempts) return false;
  const isRetryable = options.isRetryable ?? isRetryableError;
  return isRetryable(error);
}

export async function withRetry<T>(
  operation: (attempt: number) => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const maxAttempts = Math.max(1, options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS);
  const sleep = options.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;
      if (!shouldRetry(attempt, error, options)) break;
      await sleep(computeBackoffDelayMs(attempt, options));
    }
  }

  throw lastError;
}
