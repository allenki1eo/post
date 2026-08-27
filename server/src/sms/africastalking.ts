import { config } from '../config.js';
import type { SendResult, SmsGateway } from './gateway.js';

/**
 * Africa's Talking SMS.
 *
 * Sandbox and production differ only by base URL and username ('sandbox').
 * A 'Success' recipient status means accepted for delivery, NOT delivered —
 * delivery is confirmed later by the delivery-report webhook, which is why
 * `sent` and `delivered` are separate states in the message state machine. (D8)
 */
export class AfricasTalkingGateway implements SmsGateway {
  readonly name = 'africastalking';

  constructor(
    private readonly opts = {
      username: config.sms.username,
      apiKey: config.sms.apiKey,
      senderId: config.sms.senderId,
      baseUrl: config.sms.baseUrl,
    },
  ) {}

  async send(to: string, body: string): Promise<SendResult> {
    const form = new URLSearchParams({
      username: this.opts.username,
      to,
      message: body,
    });
    // A sender ID must be registered with the operator; without one AT uses a
    // shared shortcode, which is fine in sandbox and confusing in production.
    if (this.opts.senderId) form.set('from', this.opts.senderId);

    let response: Response;
    try {
      response = await fetch(`${this.opts.baseUrl}/version1/messaging`, {
        method: 'POST',
        headers: {
          apiKey: this.opts.apiKey,
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: form,
        signal: AbortSignal.timeout(15_000),
      });
    } catch (err) {
      // Network failure is retryable — the worker backs off rather than
      // treating this as the patient's problem.
      return { accepted: false, failureReason: `network: ${(err as Error).message}` };
    }

    if (!response.ok) {
      return { accepted: false, failureReason: `http ${response.status}` };
    }

    const payload = (await response.json()) as {
      SMSMessageData?: { Recipients?: Array<{ status?: string; messageId?: string; statusCode?: number }> };
    };
    const recipient = payload.SMSMessageData?.Recipients?.[0];

    if (!recipient || recipient.status !== 'Success') {
      return {
        accepted: false,
        failureReason: recipient?.status ?? 'no recipient in provider response',
      };
    }
    return { accepted: true, providerMessageId: recipient.messageId };
  }
}
