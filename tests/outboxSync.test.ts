import { MemoryLocalStore } from '../src/storage/memoryStore';
import {
  applyOutcome,
  backoffDelayMs,
  buildOperation,
  checkInIdempotencyKey,
  MAX_ATTEMPTS,
} from '../src/storage/outbox';
import { DemoSyncTransport, syncOnce, type SyncTransport } from '../src/storage/sync';
import type { OutboxOperation, StoredCheckIn } from '../src/storage/types';

const NOW = '2026-08-25T09:00:00.000Z';

function makeCheckIn(overrides: Partial<StoredCheckIn> = {}): StoredCheckIn {
  return {
    id: 'checkin-1',
    scheduleId: 'plan-1:2026-08-25',
    carePlanId: 'plan-1',
    patientId: 'patient-1',
    answers: [],
    expectedDoseIds: ['d1'],
    confirmedDoseIds: ['d1'],
    completedAt: NOW,
    deviceCreatedAt: NOW,
    syncStatus: 'local',
    revision: 1,
    ...overrides,
  };
}

function makeOperation(overrides: Partial<OutboxOperation> = {}): OutboxOperation {
  return {
    ...buildOperation({
      type: 'submit_check_in',
      idempotencyKey: checkInIdempotencyKey('checkin-1', 1),
      payload: { checkIn: makeCheckIn() },
      checkInId: 'checkin-1',
      nowIso: NOW,
      idFactory: () => 'op-1',
    }),
    ...overrides,
  };
}

describe('outbox retry policy', () => {
  it('uses bounded exponential backoff', () => {
    expect(backoffDelayMs(1)).toBe(2_000);
    expect(backoffDelayMs(2)).toBe(4_000);
    expect(backoffDelayMs(3)).toBe(8_000);
    expect(backoffDelayMs(4)).toBe(16_000);
    // Bounded: it never grows past the last step.
    expect(backoffDelayMs(99)).toBe(16_000);
  });

  it('marks accepted and duplicate outcomes as done', () => {
    expect(applyOutcome(makeOperation(), { kind: 'accepted' }, NOW).status).toBe('done');
    expect(applyOutcome(makeOperation(), { kind: 'duplicate' }, NOW).status).toBe('done');
  });

  it('schedules a later retry for a retryable error, then gives up at the bound', () => {
    let operation = makeOperation();
    for (let attempt = 1; attempt < MAX_ATTEMPTS; attempt += 1) {
      operation = applyOutcome(operation, { kind: 'retryable', message: 'offline' }, NOW);
      expect(operation.status).toBe('pending');
      expect(Date.parse(operation.nextAttemptAt)).toBeGreaterThan(Date.parse(NOW));
    }
    operation = applyOutcome(operation, { kind: 'retryable', message: 'offline' }, NOW);
    expect(operation.status).toBe('failed');
    expect(operation.attempts).toBe(MAX_ATTEMPTS);
  });

  it('fails immediately on a permanent error', () => {
    const result = applyOutcome(makeOperation(), { kind: 'permanent', message: 'rejected' }, NOW);
    expect(result.status).toBe('failed');
  });

  it('never rewrites the captured payload while retrying', () => {
    const operation = makeOperation();
    const retried = applyOutcome(operation, { kind: 'retryable', message: 'offline' }, NOW);
    expect(retried.payload).toEqual(operation.payload);
  });
});

describe('idempotency', () => {
  it('produces a stable key for the same check-in revision and a new one after an edit', () => {
    expect(checkInIdempotencyKey('c1', 1)).toBe(checkInIdempotencyKey('c1', 1));
    expect(checkInIdempotencyKey('c1', 2)).not.toBe(checkInIdempotencyKey('c1', 1));
  });

  it('enqueues only once for a repeated idempotency key', async () => {
    const store = new MemoryLocalStore();
    await store.init();
    await store.saveCheckInWithOperation(makeCheckIn(), makeOperation());
    await store.saveCheckInWithOperation(makeCheckIn(), makeOperation({ id: 'op-2' }));
    expect(await store.listOperations()).toHaveLength(1);
  });
});

describe('syncOnce', () => {
  it('sends a check-in exactly once even when the operation is retried', async () => {
    const store = new MemoryLocalStore();
    await store.init();
    const transport = new DemoSyncTransport();
    await store.saveCheckInWithOperation(makeCheckIn(), makeOperation());

    // Connectivity is down for the first pass.
    transport.failNextSends = 1;
    const first = await syncOnce(store, transport, { nowIso: NOW });
    expect(first).toMatchObject({ attempted: 1, succeeded: 0, retrying: 1 });
    expect((await store.getCheckIn('checkin-1'))?.syncStatus).toBe('local');

    // Later, when the retry becomes due, it succeeds.
    const later = '2026-08-25T09:00:30.000Z';
    const second = await syncOnce(store, transport, { nowIso: later });
    expect(second).toMatchObject({ attempted: 1, succeeded: 1 });
    expect((await store.getCheckIn('checkin-1'))?.syncStatus).toBe('synced');

    // A further pass has nothing due, and the server accepted exactly one.
    const third = await syncOnce(store, transport, { nowIso: later });
    expect(third.attempted).toBe(0);
    expect(transport.acceptedCount).toBe(1);
  });

  it('treats a server-side duplicate as success, not an error', async () => {
    const store = new MemoryLocalStore();
    await store.init();
    const transport = new DemoSyncTransport();
    // The server already saw this key (for example the response was lost).
    await transport.send(makeOperation());

    await store.saveCheckInWithOperation(makeCheckIn(), makeOperation());
    const result = await syncOnce(store, transport, { nowIso: NOW });
    expect(result.succeeded).toBe(1);
    expect(transport.acceptedCount).toBe(1);
    expect((await store.getCheckIn('checkin-1'))?.syncStatus).toBe('synced');
  });

  it('keeps the operation when the transport throws, rather than dropping data', async () => {
    const store = new MemoryLocalStore();
    await store.init();
    const throwing: SyncTransport = {
      send: async () => {
        throw new Error('socket closed');
      },
    };
    await store.saveCheckInWithOperation(makeCheckIn(), makeOperation());
    const result = await syncOnce(store, throwing, { nowIso: NOW });
    expect(result.retrying).toBe(1);
    const [operation] = await store.listOperations();
    expect(operation.status).toBe('pending');
    expect(operation.lastError).toContain('socket closed');
  });

  it('does not send operations that are not yet due', async () => {
    const store = new MemoryLocalStore();
    await store.init();
    const transport = new DemoSyncTransport();
    await store.saveCheckInWithOperation(
      makeCheckIn(),
      makeOperation({ nextAttemptAt: '2026-08-25T10:00:00.000Z' }),
    );
    expect((await syncOnce(store, transport, { nowIso: NOW })).attempted).toBe(0);
  });

  it('reports failed sync state on the check-in after the retry bound', async () => {
    const store = new MemoryLocalStore();
    await store.init();
    const alwaysFailing: SyncTransport = {
      send: async () => ({ kind: 'permanent', message: 'rejected by server' }),
    };
    await store.saveCheckInWithOperation(makeCheckIn(), makeOperation());
    await syncOnce(store, alwaysFailing, { nowIso: NOW });
    expect((await store.getCheckIn('checkin-1'))?.syncStatus).toBe('failed');
    expect(await store.countUnsyncedCheckIns()).toBe(1);
  });
});
