import { normalizeEmail, normalizeEmailTransform } from './normalize-email';

describe('normalizeEmail', () => {
  it('trims and lower-cases', () => {
    expect(normalizeEmail('  Jane@Corp.COM ')).toBe('jane@corp.com');
  });

  it('leaves non-strings to the validator', () => {
    expect(normalizeEmailTransform({ value: 42 })).toBe(42);
    expect(normalizeEmailTransform({ value: undefined })).toBeUndefined();
  });
});
