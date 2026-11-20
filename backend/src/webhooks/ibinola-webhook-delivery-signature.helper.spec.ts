import {
  DEFAULT_WEBHOOK_TOLERANCE_SECONDS,
  IBINOLA_WEBHOOK_SIGNATURE_HEADER,
  IBINOLA_WEBHOOK_TIMESTAMP_HEADER,
  signWebhookDelivery,
  verifyWebhookDelivery,
} from './ibinola-webhook-delivery-signature.helper';

describe('ibinola-webhook-delivery-signature.helper', () => {
  const secret = 'sub_secret';
  const payload = JSON.stringify({ event: 'asset.created', data: { id: 'a1' } });
  const nowMs = 1_700_000_000_000;

  it('signs outbound deliveries with a verifiable signature and timestamp header', () => {
    const headers = signWebhookDelivery(payload, secret, nowMs);
    expect(headers[IBINOLA_WEBHOOK_SIGNATURE_HEADER]).toMatch(/^sha256=[0-9a-f]{64}$/);
    expect(headers[IBINOLA_WEBHOOK_TIMESTAMP_HEADER]).toBe(String(Math.floor(nowMs / 1000)));

    const ok = verifyWebhookDelivery(
      payload,
      headers[IBINOLA_WEBHOOK_SIGNATURE_HEADER],
      headers[IBINOLA_WEBHOOK_TIMESTAMP_HEADER],
      secret,
      { nowMs },
    );
    expect(ok).toBe(true);
  });

  it('rejects tampered payloads and wrong secrets', () => {
    const headers = signWebhookDelivery(payload, secret, nowMs);
    expect(
      verifyWebhookDelivery(
        payload + ' ',
        headers[IBINOLA_WEBHOOK_SIGNATURE_HEADER],
        headers[IBINOLA_WEBHOOK_TIMESTAMP_HEADER],
        secret,
        { nowMs },
      ),
    ).toBe(false);
    expect(
      verifyWebhookDelivery(
        payload,
        headers[IBINOLA_WEBHOOK_SIGNATURE_HEADER],
        headers[IBINOLA_WEBHOOK_TIMESTAMP_HEADER],
        'other',
        { nowMs },
      ),
    ).toBe(false);
  });

  it('rejects stale timestamps outside tolerance', () => {
    const headers = signWebhookDelivery(payload, secret, nowMs);
    const staleNow = nowMs + (DEFAULT_WEBHOOK_TOLERANCE_SECONDS + 1) * 1000;
    expect(
      verifyWebhookDelivery(
        payload,
        headers[IBINOLA_WEBHOOK_SIGNATURE_HEADER],
        headers[IBINOLA_WEBHOOK_TIMESTAMP_HEADER],
        secret,
        { nowMs: staleNow },
      ),
    ).toBe(false);
  });
});
