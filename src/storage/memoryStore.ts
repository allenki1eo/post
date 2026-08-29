/**
 * In-memory `LocalStore`.
 *
 * Used by tests and by the Expo web demo, where the native SQLite module is
 * not available. It implements the same contract — including the transactional
 * save and the idempotent enqueue — so the outbox and sync rules behave
 * identically in both environments.
 */
import type { SyncStatus } from '../domain/models';
import type { CachedCarePlan, LocalStore, OutboxOperation, StoredCheckIn } from './types';

export class MemoryLocalStore implements LocalStore {
  private readonly checkIns = new Map<string, StoredCheckIn>();
  private readonly operations = new Map<string, OutboxOperation>();
  private readonly operationKeys = new Set<string>();
  private readonly cachedPlans = new Map<string, CachedCarePlan>();

  async init(): Promise<void> {
    // Nothing to migrate.
  }

  async saveCheckInWithOperation(
    checkIn: StoredCheckIn,
    operation: OutboxOperation,
  ): Promise<void> {
    // Both writes land together; there is no interleaving point in JS here.
    this.checkIns.set(checkIn.id, { ...checkIn });
    if (!this.operationKeys.has(operation.idempotencyKey)) {
      this.operationKeys.add(operation.idempotencyKey);
      this.operations.set(operation.id, { ...operation });
    }
  }

  async getCheckIn(checkInId: string): Promise<StoredCheckIn | undefined> {
    const checkIn = this.checkIns.get(checkInId);
    return checkIn ? { ...checkIn } : undefined;
  }

  async listCheckIns(patientId: string): Promise<StoredCheckIn[]> {
    return [...this.checkIns.values()]
      .filter((checkIn) => checkIn.patientId === patientId)
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
      .map((checkIn) => ({ ...checkIn }));
  }

  async setCheckInSyncStatus(checkInId: string, syncStatus: SyncStatus): Promise<void> {
    const checkIn = this.checkIns.get(checkInId);
    if (checkIn) {
      this.checkIns.set(checkInId, { ...checkIn, syncStatus });
    }
  }

  async countUnsyncedCheckIns(): Promise<number> {
    return [...this.checkIns.values()].filter((checkIn) => checkIn.syncStatus !== 'synced').length;
  }

  async listDueOperations(nowIso: string): Promise<OutboxOperation[]> {
    return [...this.operations.values()]
      .filter((op) => op.status === 'pending' && op.nextAttemptAt <= nowIso)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((op) => ({ ...op }));
  }

  async findOperationByKey(idempotencyKey: string): Promise<OutboxOperation | undefined> {
    const found = [...this.operations.values()].find((op) => op.idempotencyKey === idempotencyKey);
    return found ? { ...found } : undefined;
  }

  async listOperations(): Promise<OutboxOperation[]> {
    return [...this.operations.values()]
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((op) => ({ ...op }));
  }

  async updateOperation(operation: OutboxOperation): Promise<void> {
    const existing = this.operations.get(operation.id);
    if (!existing) {
      return;
    }
    // Retry bookkeeping only: the captured payload stays immutable.
    this.operations.set(operation.id, {
      ...existing,
      attempts: operation.attempts,
      nextAttemptAt: operation.nextAttemptAt,
      status: operation.status,
      ...(operation.lastError === undefined ? {} : { lastError: operation.lastError }),
    });
  }

  async cacheActiveCarePlan(cached: CachedCarePlan): Promise<void> {
    this.cachedPlans.set(cached.patientId, { ...cached });
  }

  async getCachedActiveCarePlan(patientId: string): Promise<CachedCarePlan | undefined> {
    const cached = this.cachedPlans.get(patientId);
    return cached ? { ...cached } : undefined;
  }
}
