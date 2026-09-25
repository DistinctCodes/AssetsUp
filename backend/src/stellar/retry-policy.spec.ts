import {
  DEFAULT_MAX_ATTEMPTS,
  DEFAULT_MAX_DELAY_MS,
  RETRYABLE_ERROR_CODES,
  computeBackoffDelayMs,
  errorCode,
  isRetryableError,
  shouldRetry,
  withRetry,
} from './retry-policy';

function networkError(code: string): Error {
  const error = new Error(`request failed with ${code}`);
  (error as Error & { code: string }).code = code;
  return error;
}

const noSleep = async (): Promise<void> => undefined;

describe('errorCode', () => {
  it('reads a code from an error-like object', () => {
    expect(errorCode(networkError('ECONNRESET'))).toBe('ECONNRESET');
  });

  it('returns null for anything without a string code', () => {
    expect(errorCode(new Error('boom'))).toBeNull();
    expect(errorCode(null)).toBeNull();
    expect(errorCode('ECONNRESET')).toBeNull();
  });
});

describe('isRetryableError', () => {
  it('accepts every known transient code', () => {
    for (const code of RETRYABLE_ERROR_CODES) {
      expect(isRetryableError(networkError(code))).toBe(true);
    }
  });

  it('accepts transient messages without a code', () => {
    expect(isRetryableError(new Error('request timed out'))).toBe(true);
    expect(isRetryableError(new Error('socket hang up'))).toBe(true);
  });

  it('rejects permanent failures', () => {
    expect(isRetryableError(new Error('Bad Request'))).toBe(false);
    expect(isRetryableError(networkError('ERR_INVALID_ARG_TYPE'))).toBe(false);
  });
});

describe('computeBackoffDelayMs', () => {
  it('grows exponentially from the base delay', () => {
    expect(computeBackoffDelayMs(1, { baseDelayMs: 100, jitter: 0 })).toBe(100);
    expect(computeBackoffDelayMs(2, { baseDelayMs: 100, jitter: 0 })).toBe(200);
    expect(computeBackoffDelayMs(3, { baseDelayMs: 100, jitter: 0 })).toBe(400);
  });

  it('caps the delay', () => {
    expect(computeBackoffDelayMs(20, { baseDelayMs: 100, maxDelayMs: 1_000, jitter: 0 })).toBe(
      1_000,
    );
    expect(DEFAULT_MAX_DELAY_MS).toBe(5_000);
  });

  it('applies bounded jitter deterministically when a random source is given', () => {
    const delay = computeBackoffDelayMs(1, { baseDelayMs: 100, jitter: 0.2, random: () => 0 });
    expect(delay).toBe(80);
    expect(computeBackoffDelayMs(1, { baseDelayMs: 100, jitter: 0.2, random: () => 1 })).toBe(
      100,
    );
  });

  it('never returns a negative delay', () => {
    const delay = computeBackoffDelayMs(1, { baseDelayMs: 100, jitter: 5, random: () => 0 });
    expect(delay).toBeGreaterThanOrEqual(0);
  });

  it('falls back to the first attempt for invalid input', () => {
    expect(computeBackoffDelayMs(0, { baseDelayMs: 100, jitter: 0 })).toBe(100);
    expect(computeBackoffDelayMs(Number.NaN, { baseDelayMs: 100, jitter: 0 })).toBe(100);
  });
});

describe('shouldRetry', () => {
  it('stops once the attempt budget is spent', () => {
    const error = networkError('ETIMEDOUT');
    expect(shouldRetry(1, error)).toBe(true);
    expect(shouldRetry(DEFAULT_MAX_ATTEMPTS, error)).toBe(false);
  });

  it('honours a custom predicate and limit', () => {
    const error = new Error('nope');
    expect(shouldRetry(1, error, { isRetryable: () => true })).toBe(true);
    expect(shouldRetry(1, error, { maxAttempts: 1 })).toBe(false);
  });
});

describe('withRetry', () => {
  it('returns the first successful result without sleeping', async () => {
    const sleep = jest.fn(noSleep);
    const operation = jest.fn(async () => 'ok');
    await expect(withRetry(operation, { sleep })).resolves.toBe('ok');
    expect(operation).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('retries a transient failure and succeeds', async () => {
    const sleep = jest.fn(noSleep);
    let calls = 0;
    const operation = async (): Promise<string> => {
      calls += 1;
      if (calls < 3) throw networkError('ECONNRESET');
      return 'recovered';
    };
    await expect(withRetry(operation, { sleep })).resolves.toBe('recovered');
    expect(calls).toBe(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it('gives up after maxAttempts and rethrows the last error', async () => {
    const sleep = jest.fn(noSleep);
    const operation = jest.fn(async () => {
      throw networkError('ETIMEDOUT');
    });
    await expect(withRetry(operation, { sleep, maxAttempts: 3 })).rejects.toThrow('ETIMEDOUT');
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('does not retry a permanent error', async () => {
    const sleep = jest.fn(noSleep);
    const operation = jest.fn(async () => {
      throw new Error('Bad Request');
    });
    await expect(withRetry(operation, { sleep })).rejects.toThrow('Bad Request');
    expect(operation).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('backs off with increasing delays', async () => {
    const delays: number[] = [];
    const sleep = jest.fn(async (ms: number) => {
      delays.push(ms);
    });
    const operation = async (): Promise<string> => {
      if (delays.length < 2) throw networkError('ECONNRESET');
      return 'ok';
    };
    await withRetry(operation, { sleep, baseDelayMs: 100, jitter: 0 });
    expect(delays).toEqual([100, 200]);
  });
});
