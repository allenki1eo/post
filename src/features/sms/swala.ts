/**
 * Swala SMS adapter for the trusted backend.
 *
 * Do not import this module into an Expo screen or expose its API key through
 * an EXPO_PUBLIC_ variable. A backend worker should call it only after checking
 * recorded SMS consent and an approved reminder template.
 */

export interface SwalaSmsConfig {
  apiKey: string;
  senderId: string;
  baseUrl?: string;
}

export interface SendSmsInput {
  /** E.164 recipient, for example +255712345678. */
  recipient: string;
  body: string;
  /** Stable event identifier used to prevent duplicate sends. */
  idempotencyKey: string;
}

export interface SwalaMessageReceipt {
  id?: string;
  status?: string;
  [key: string]: unknown;
}

const DEFAULT_BASE_URL = 'https://swalasms.com/api/v1';
const E164 = /^\+[1-9]\d{7,14}$/;
const IDEMPOTENCY_KEY = /^[A-Za-z0-9._:-]{1,128}$/;

export async function sendSwalaSms(
  config: SwalaSmsConfig,
  input: SendSmsInput,
  fetcher: typeof fetch = fetch,
): Promise<SwalaMessageReceipt> {
  validate(config, input);
  const baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '');
  const response = await fetcher(`${baseUrl}/sms/quick-message`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': input.idempotencyKey,
    },
    body: JSON.stringify({
      recipient: input.recipient,
      sender_id: config.senderId,
      body: input.body,
    }),
  });

  if (!response.ok) {
    // Avoid echoing provider response bodies: they can contain phone numbers or
    // message content and do not belong in application logs.
    throw new SwalaSmsError(response.status);
  }

  return (await response.json()) as SwalaMessageReceipt;
}

export class SwalaSmsError extends Error {
  constructor(readonly status: number) {
    super(`Swala SMS request failed with status ${status}`);
    this.name = 'SwalaSmsError';
  }
}

function validate(config: SwalaSmsConfig, input: SendSmsInput): void {
  if (!config.apiKey.trim()) throw new Error('Swala API key is required');
  if (!config.senderId.trim()) throw new Error('Swala sender ID is required');
  if (!E164.test(input.recipient)) throw new Error('SMS recipient must use E.164 format');
  if (!input.body.trim()) throw new Error('SMS body is required');
  if (!IDEMPOTENCY_KEY.test(input.idempotencyKey)) {
    throw new Error('A valid SMS idempotency key is required');
  }
}
