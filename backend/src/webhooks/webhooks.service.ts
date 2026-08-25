import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

export interface WebhookSubscription {
  id: string;
  url: string;
  secret: string;
  events: string[];
}

/**
 * Outbound webhooks: delivers signed event payloads to subscriber URLs with
 * retries.
 *
 * Each delivery is signed with the subscription secret (HMAC-SHA256) in an
 * `X-Signature` header so receivers can verify authenticity. Failed deliveries
 * are retried with exponential backoff.
 */
@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  /** Compute the signature a receiver uses to verify a delivery. */
  sign(secret: string, payload: string): string {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  /** Deliver an event to every subscription registered for it. */
  async dispatch(
    subscriptions: WebhookSubscription[],
    event: string,
    data: unknown,
  ): Promise<void> {
    const payload = JSON.stringify({ event, data, timestamp: Date.now() });
    for (const sub of subscriptions.filter((s) => s.events.includes(event))) {
      await this.deliver(sub, payload);
    }
  }

  private async deliver(
    sub: WebhookSubscription,
    payload: string,
    attempt = 1,
  ): Promise<void> {
    const maxAttempts = 3;
    try {
      const res = await fetch(sub.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Signature': this.sign(sub.secret, payload),
        },
        body: payload,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      if (attempt < maxAttempts) {
        const delayMs = 1000 * 2 ** (attempt - 1);
        await new Promise((r) => setTimeout(r, delayMs));
        return this.deliver(sub, payload, attempt + 1);
      }
      this.logger.error(
        `Webhook ${sub.id} failed after ${maxAttempts} attempts: ${(err as Error).message}`,
      );
    }
  }
}
