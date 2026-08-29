/**
 * Outbox: durable, idempotent, bounded-retry delivery of local writes.
 *
 * Rules from the specification (§13):
 * - a submitted check-in is saved and enqueued in one local transaction, and
 *   the patient is confirmed immediately;
 * - operations are immutable — a retry resends exactly what was captured;
 * - idempotency keys mean retries can never create duplicate check-ins;
 * - retries use bounded exponential backoff and stop after a maximum count.
 */
import { newId } from '../utils/ids';
import type { OutboxOperation, OutboxOperationType } from './types';

/** Backoff schedule in milliseconds: 2s, 4s, 8s, 16s, then capped. */
export const RETRY_BACKOFF_MS = [2_000, 4_000, 8_000, 16_000] as const;
export const MAX_ATTEMPTS = RETRY_BACKOFF_MS.length;

export function backoffDelayMs(attempts: number): number {
  const index = Math.min(Math.max(attempts, 1), RETRY_BACKOFF_MS.length) - 1;
  return RETRY_BACKOFF_MS[index];
}

export function nextAttemptAt(nowIso: string, attempts: number): string {
  return new Date(Date.parse(nowIso) + backoffDelayMs(attempts)).toISOString();
}

/**
 * The idempotency key for a check-in submission. It includes the revision so a
 * patient edit before sync is a distinct operation, while a plain retry of the
 * same revision always reuses the same key.
 */
export function checkInIdempotencyKey(checkInId: string, revision: number): string {
  return `submit_check_in:${checkInId}:r${revision}`;
}

export interface BuildOperationInput {
  type: OutboxOperationType;
  idempotencyKey: string;
  payload: Record<string, unknown>;
  checkInId?: string;
  nowIso: string;
  idFactory?: () => string;
}

export function buildOperation(input: BuildOperationInput): OutboxOperation {
  return {
    id: (input.idFactory ?? newId)(),
    idempotencyKey: input.idempotencyKey,
    type: input.type,
    payload: input.payload,
    ...(input.checkInId ? { checkInId: input.checkInId } : {}),
    createdAt: input.nowIso,
    attempts: 0,
    // Due immediately; the sync engine sends on the next opportunity.
    nextAttemptAt: input.nowIso,
    status: 'pending',
  };
}

export type OperationOutcome =
  | { kind: 'accepted' }
  /** The server already has this idempotency key: success, not an error. */
  | { kind: 'duplicate' }
  | { kind: 'retryable'; message: string }
  | { kind: 'permanent'; message: string };

/**
 * Pure retry decision. Returns the operation's next bookkeeping state; the
 * payload is deliberately carried through untouched.
 */
export function applyOutcome(
  operation: OutboxOperation,
  outcome: OperationOutcome,
  nowIso: string,
): OutboxOperation {
  switch (outcome.kind) {
    case 'accepted':
    case 'duplicate':
      return { ...operation, status: 'done', attempts: operation.attempts + 1 };
    case 'permanent':
      return {
        ...operation,
        status: 'failed',
        attempts: operation.attempts + 1,
        lastError: outcome.message,
      };
    case 'retryable': {
      const attempts = operation.attempts + 1;
      if (attempts >= MAX_ATTEMPTS) {
        return { ...operation, status: 'failed', attempts, lastError: outcome.message };
      }
      return {
        ...operation,
        status: 'pending',
        attempts,
        nextAttemptAt: nextAttemptAt(nowIso, attempts),
        lastError: outcome.message,
      };
    }
  }
}
