/**
 * Local persistence contract.
 *
 * The app persists to SQLite on device, but every piece of logic that matters
 * for correctness (outbox retry, idempotency, exactly-once sync, sync-state
 * reporting) is written against this interface rather than against SQL. That
 * keeps those rules testable without a native module and lets the web demo run
 * on an in-memory store.
 */
import type { CarePlan, CarePlanTemplate, CheckInResponse, SyncStatus } from '../domain/models';

/** A check-in as held on the device, with its local revision. */
export interface StoredCheckIn extends CheckInResponse {
  /** Incremented when the patient edits before the server has accepted it. */
  revision: number;
}

export type OutboxOperationType = 'submit_check_in' | 'queue_agent_trigger';

export type OutboxStatus = 'pending' | 'done' | 'failed';

/**
 * An immutable outbox operation. The payload is written once at enqueue time
 * and never rewritten: retries resend exactly what was captured, so a retry can
 * never smuggle in later edits.
 */
export interface OutboxOperation {
  id: string;
  /** Stable across retries; the server dedupes on this. */
  idempotencyKey: string;
  type: OutboxOperationType;
  payload: Record<string, unknown>;
  /** The check-in this operation carries, when it carries one. */
  checkInId?: string;
  createdAt: string;
  attempts: number;
  nextAttemptAt: string;
  status: OutboxStatus;
  lastError?: string;
}

export interface CachedCarePlan {
  patientId: string;
  carePlan: CarePlan;
  template: CarePlanTemplate;
  cachedAt: string;
}

export interface LocalStore {
  init(): Promise<void>;

  /**
   * Persist a submitted check-in and enqueue its outbox operation in ONE
   * transaction, so the device never holds a check-in that will not be sent
   * or an operation for a check-in that was not saved. Enqueueing is
   * idempotent on `idempotencyKey`.
   */
  saveCheckInWithOperation(checkIn: StoredCheckIn, operation: OutboxOperation): Promise<void>;

  getCheckIn(checkInId: string): Promise<StoredCheckIn | undefined>;
  listCheckIns(patientId: string): Promise<StoredCheckIn[]>;
  setCheckInSyncStatus(checkInId: string, syncStatus: SyncStatus): Promise<void>;
  countUnsyncedCheckIns(): Promise<number>;

  listDueOperations(nowIso: string): Promise<OutboxOperation[]>;
  findOperationByKey(idempotencyKey: string): Promise<OutboxOperation | undefined>;
  listOperations(): Promise<OutboxOperation[]>;
  updateOperation(operation: OutboxOperation): Promise<void>;

  cacheActiveCarePlan(cached: CachedCarePlan): Promise<void>;
  getCachedActiveCarePlan(patientId: string): Promise<CachedCarePlan | undefined>;
}
