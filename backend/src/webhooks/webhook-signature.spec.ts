import { signPayload, parseSignatureHeader, constantTimeEqual, verifySignature, SIGNATURE_PREFIX } from './webhook-signature';

const SECRET = 'whsec_test_secret';
const PAYLOAD = '{"event":"asset.created","id":"abc-123"}';

describe('signPayload', () => {
  it('produces a prefixed sha256 hex digest', () => {
    const signature = signPayload(PAYLOAD, SECRET);
    expect(signature.startsWith(SIGNATURE_PREFIX)).toBe(true);
    expect(signature.slice(SIGNATURE_PREFIX.length)).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic for the same payload and secret', () => {
    expect(signPayload(PAYLOAD, SECRET)).toBe(signPayload(PAYLOAD, SECRET));
  });

  it('changes when the secret changes', () => {
    expect(signPayload(PAYLOAD, SECRET)).not.toBe(signPayload(PAYLOAD, 'other'));
  });
});

describe('parseSignatureHeader', () => {
  it('accepts a well-formed header', () => {
    const digest = signPayload(PAYLOAD, SECRET).slice(SIGNATURE_PREFIX.length);
    expect(parseSignatureHeader(`sha256=${digest}`)).toBe(digest);
  });

  it('is case-insensitive about the algorithm prefix and digest', () => {
    const digest = signPayload(PAYLOAD, SECRET).slice(SIGNATURE_PREFIX.length);
    expect(parseSignatureHeader(`SHA256=${digest.toUpperCase()}`)).toBe(digest);
  });

  it('uses the first entry when several signatures are sent', () => {
    const digest = signPayload(PAYLOAD, SECRET).slice(SIGNATURE_PREFIX.length);
    expect(parseSignatureHeader(`sha256=${digest}, sha256=deadbeef`)).toBe(digest);
  });

  it('rejects malformed or missing headers', () => {
    expect(parseSignatureHeader(null)).toBeNull();
    expect(parseSignatureHeader(undefined)).toBeNull();
    expect(parseSignatureHeader('')).toBeNull();
    expect(parseSignatureHeader('deadbeef')).toBeNull();
    expect(parseSignatureHeader('v1=abc')).toBeNull();
    expect(parseSignatureHeader('sha256=not-hex')).toBeNull();
    expect(parseSignatureHeader('sha256=')).toBeNull();
  });
});

describe('constantTimeEqual', () => {
  it('matches identical strings', () => {
    expect(constantTimeEqual('abc', 'abc')).toBe(true);
  });

  it('rejects different strings of the same length', () => {
    expect(constantTimeEqual('abc', 'abd')).toBe(false);
  });

  it('rejects different lengths', () => {
    expect(constantTimeEqual('abc', 'abcd')).toBe(false);
    expect(constantTimeEqual('', 'a')).toBe(false);
    expect(constantTimeEqual('', '')).toBe(true);
  });
});

describe('verifySignature', () => {
  it('accepts a correctly signed payload', () => {
    expect(verifySignature(PAYLOAD, signPayload(PAYLOAD, SECRET), SECRET)).toBe(true);
  });

  it('rejects a payload that was modified after signing', () => {
    const signature = signPayload(PAYLOAD, SECRET);
    expect(verifySignature(`${PAYLOAD} `, signature, SECRET)).toBe(false);
  });

  it('rejects a signature made with another secret', () => {
    expect(verifySignature(PAYLOAD, signPayload(PAYLOAD, 'other'), SECRET)).toBe(false);
  });

  it('rejects requests with no signature header', () => {
    expect(verifySignature(PAYLOAD, null, SECRET)).toBe(false);
    expect(verifySignature(PAYLOAD, '', SECRET)).toBe(false);
  });

  it('rejects when the shared secret is not configured', () => {
    expect(verifySignature(PAYLOAD, signPayload(PAYLOAD, SECRET), '')).toBe(false);
  });

  it('rejects a non-string payload', () => {
    expect(verifySignature(undefined, signPayload(PAYLOAD, SECRET), SECRET)).toBe(false);
  });
});
