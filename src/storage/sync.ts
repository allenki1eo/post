/**
 * Sync engine.
 *
 * Drains due outbox operations through a transport and reflects the result in
 * each check-in's patient-visible sync state. A check-in reaches the server
 * exactly once: the transport dedupes on the operation's idempotency key, and
 * both `accepted` and `duplicate` resolve the operation as done.
 *
 * The engine never resolves a conflict on its own and never overwrites a
 * clinician decision — it only reports what the server said.
 */
import type { SyncStatus } from '../domain/models';
import { applyOutcome, type OperationOutcome } from './outbox';
import type { LocalStore, OutboxOperation } from './types';

export interface SyncTransport {
  /** Send one immutable operation. Must dedupe on `operation.idempotencyKey`. */
  send(operation: OutboxOperation): Promise<OperationOutcome>;
}

export interface SyncResult {
  attempted: number;
  succeeded: number;
  retrying: number;
  failed: number;
}

export interface SyncOptions {
  nowIso?: string;
  /** Safety bound so one pass cannot spin forever. */
  maxOperations?: number;
}

export async function syncOnce(
  store: LocalStore,
  transport: SyncTransport,
  options: SyncOptions = {},
): Promise<SyncResult> {
  const nowIso = options.nowIso ?? new Date().toISOString();
  const due = (await store.listDueOperations(nowIso)).slice(0, options.maxOperations ?? 50);
  const result: SyncResult = { attempted: 0, succeeded: 0, retrying: 0, failed: 0 };

  for (const operation of due) {
    result.attempted += 1;
    if (operation.checkInId) {
      await store.setCheckInSyncStatus(operation.checkInId, 'syncing');
    }

    let outcome: OperationOutcome;
    try {
      outcome = await transport.send(operation);
    } catch (error) {
      // An unexpected throw is treated as retryable: the device keeps the
      // operation rather than dropping the patient's data.
      outcome = { kind: 'retryable', message: errorMessage(error) };
    }

    const updated = applyOutcome(operation, outcome, nowIso);
    await store.updateOperation(updated);

    if (operation.checkInId) {
      await store.setCheckInSyncStatus(operation.checkInId, syncStatusFor(updated));
    }

    if (updated.status === 'done') {
      result.succeeded += 1;
    } else if (updated.status === 'failed') {
      result.failed += 1;
    } else {
      result.retrying += 1;
    }
  }

  return result;
}

function syncStatusFor(operation: OutboxOperation): SyncStatus {
  if (operation.status === 'done') {
    return 'synced';
  }
  if (operation.status === 'failed') {
    return 'failed';
  }
  return 'local';
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'unknown transport error';
}

/**
 * Demo transport: accepts everything and remembers which idempotency keys it
 * has seen, so a replayed operation returns `duplicate` exactly as a real
 * backend would. It is the seam a real HTTP transport replaces.
 */
export class DemoSyncTransport implements SyncTransport {
  private readonly seenKeys = new Set<string>();
  /** Set to make the next N sends fail as retryable, for offline demos. */
  public failNextSends = 0;

  async send(operation: OutboxOperation): Promise<OperationOutcome> {
    if (this.failNextSends > 0) {
      this.failNextSends -= 1;
      return { kind: 'retryable', message: 'demo: no connectivity' };
    }
    if (this.seenKeys.has(operation.idempotencyKey)) {
      return { kind: 'duplicate' };
    }
    this.seenKeys.add(operation.idempotencyKey);
    return { kind: 'accepted' };
  }

  /** Number of distinct operations the "server" actually accepted. */
  get acceptedCount(): number {
    return this.seenKeys.size;
  }
}
