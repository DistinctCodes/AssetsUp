/**
 * Strict environment validation.
 *
 * Wire this into `ConfigModule.forRoot({ validate })` so the app fails fast on
 * boot when a required secret/variable is missing, instead of starting in a
 * broken state.
 */

const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'JWT_SECRET',
] as const;

const NUMERIC_ENV_VARS = ['PORT', 'THROTTLE_TTL', 'THROTTLE_LIMIT'] as const;

export function validateEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const missing = REQUIRED_ENV_VARS.filter(
    (key) => config[key] === undefined || config[key] === '',
  );
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }

  for (const key of NUMERIC_ENV_VARS) {
    const value = config[key];
    if (value !== undefined && Number.isNaN(Number(value))) {
      throw new Error(`Environment variable ${key} must be a number`);
    }
  }

  return config;
}
