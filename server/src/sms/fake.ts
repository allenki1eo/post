import { randomUUID } from 'node:crypto';
import type { SendResult, SmsGateway } from './gateway.js';

export interface OutboxEntry {
  to: string;
  body: string;
  at: Date;
  providerMessageId: string;
}

/**
 * Dev and test gateway. Records what would have been sent so the whole loop —
 * reminder, reply, escalation — is exercisable without spending SMS credit.
 * `failNext` lets a test drive the delivery state machine's retry path.
 */
export class FakeSmsGateway implements SmsGateway {
  readonly name = 'fake';
  readonly outbox: OutboxEntry[] = [];
  private failures = 0;

  failNext(times = 1) {
    this.failures += times;
  }

  clear() {
    this.outbox.length = 0;
    this.failures = 0;
  }

  async send(to: string, body: string): Promise<SendResult> {
    if (this.failures > 0) {
      this.failures -= 1;
      return { accepted: false, failureReason: 'simulated network failure' };
    }
    const providerMessageId = `fake-${randomUUID()}`;
    this.outbox.push({ to, body, at: new Date(), providerMessageId });
    return { accepted: true, providerMessageId };
  }

  /** Messages sent to one number, oldest first. */
  for(phone: string): OutboxEntry[] {
    return this.outbox.filter((m) => m.to === phone);
  }

  get last(): OutboxEntry | undefined {
    return this.outbox[this.outbox.length - 1];
  }
}
