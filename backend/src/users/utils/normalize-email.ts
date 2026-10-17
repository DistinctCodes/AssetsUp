/** Canonical form of an email address: trimmed and lower-cased. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * `class-transformer` helper for DTO fields. Non-strings pass through untouched
 * so `@IsEmail()` still reports them.
 */
export function normalizeEmailTransform({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? normalizeEmail(value) : value;
}
