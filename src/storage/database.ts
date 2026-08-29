/**
 * SQLite-backed `LocalStore` (device implementation).
 *
 * All SQL for the app lives here. The rules that govern correctness live in
 * `outbox.ts` / `sync.ts` and are written against the `LocalStore` interface,
 * so they are covered by tests that need no native module.
 */
import * as SQLite from 'expo-sqlite';

import type { SyncStatus } from '../domain/models';
import { MIGRATIONS } from './migrations/001_initial';
import type { CachedCarePlan, LocalStore, OutboxOperation, StoredCheckIn } from './types';

interface CheckInRow {
  id: string;
  schedule_id: string;
  care_plan_id: string;
  patient_id: string;
  answers_json: string;
  expected_dose_ids_json: string;
  confirmed_dose_ids_json: string;
  patient_note: string | null;
  completed_at: string;
  device_created_at: string;
  sync_status: string;
  revision: number;
}

interface OutboxRow {
  id: string;
  idempotency_key: string;
  type: string;
  payload_json: string;
  check_in_id: string | null;
  created_at: string;
  attempts: number;
  next_attempt_at: string;
  status: string;
  last_error: string | null;
}

interface CachedPlanRow {
  patient_id: string;
  care_plan_json: string;
  template_json: string;
  cached_at: string;
}

function toCheckIn(row: CheckInRow): StoredCheckIn {
  return {
    id: row.id,
    scheduleId: row.schedule_id,
    carePlanId: row.care_plan_id,
    patientId: row.patient_id,
    answers: JSON.parse(row.answers_json),
    expectedDoseIds: JSON.parse(row.expected_dose_ids_json),
    confirmedDoseIds: JSON.parse(row.confirmed_dose_ids_json),
    ...(row.patient_note ? { patientNote: row.patient_note } : {}),
    completedAt: row.completed_at,
    deviceCreatedAt: row.device_created_at,
    syncStatus: row.sync_status as SyncStatus,
    revision: row.revision,
  };
}

function toOperation(row: OutboxRow): OutboxOperation {
  return {
    id: row.id,
    idempotencyKey: row.idempotency_key,
    type: row.type as OutboxOperation['type'],
    payload: JSON.parse(row.payload_json),
    ...(row.check_in_id ? { checkInId: row.check_in_id } : {}),
    createdAt: row.created_at,
    attempts: row.attempts,
    nextAttemptAt: row.next_attempt_at,
    status: row.status as OutboxOperation['status'],
    ...(row.last_error ? { lastError: row.last_error } : {}),
  };
}

export class SqliteLocalStore implements LocalStore {
  private database: SQLite.SQLiteDatabase | undefined;

  constructor(private readonly databaseName = 'post.db') {}

  private get db(): SQLite.SQLiteDatabase {
    if (!this.database) {
      throw new Error('LocalStore.init() must be awaited before use');
    }
    return this.database;
  }

  async init(): Promise<void> {
    if (this.database) {
      return;
    }
    this.database = await SQLite.openDatabaseAsync(this.databaseName);
    await this.database.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
    const row = await this.database.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    const current = row?.user_version ?? 0;
    for (const migration of MIGRATIONS) {
      if (migration.version > current) {
        await this.database.execAsync(migration.sql);
        await this.database.execAsync(`PRAGMA user_version = ${migration.version}`);
      }
    }
  }

  async saveCheckInWithOperation(
    checkIn: StoredCheckIn,
    operation: OutboxOperation,
  ): Promise<void> {
    await this.db.withTransactionAsync(async () => {
      await this.db.runAsync(
        `INSERT OR REPLACE INTO check_ins
           (id, schedule_id, care_plan_id, patient_id, answers_json, expected_dose_ids_json,
            confirmed_dose_ids_json, patient_note, completed_at, device_created_at, sync_status, revision)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          checkIn.id,
          checkIn.scheduleId,
          checkIn.carePlanId,
          checkIn.patientId,
          JSON.stringify(checkIn.answers),
          JSON.stringify(checkIn.expectedDoseIds),
          JSON.stringify(checkIn.confirmedDoseIds),
          checkIn.patientNote ?? null,
          checkIn.completedAt,
          checkIn.deviceCreatedAt,
          checkIn.syncStatus,
          checkIn.revision,
        ],
      );
      // OR IGNORE makes enqueueing idempotent on the unique idempotency key.
      await this.db.runAsync(
        `INSERT OR IGNORE INTO outbox
           (id, idempotency_key, type, payload_json, check_in_id, created_at, attempts, next_attempt_at, status, last_error)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          operation.id,
          operation.idempotencyKey,
          operation.type,
          JSON.stringify(operation.payload),
          operation.checkInId ?? null,
          operation.createdAt,
          operation.attempts,
          operation.nextAttemptAt,
          operation.status,
          operation.lastError ?? null,
        ],
      );
    });
  }

  async getCheckIn(checkInId: string): Promise<StoredCheckIn | undefined> {
    const row = await this.db.getFirstAsync<CheckInRow>('SELECT * FROM check_ins WHERE id = ?', [
      checkInId,
    ]);
    return row ? toCheckIn(row) : undefined;
  }

  async listCheckIns(patientId: string): Promise<StoredCheckIn[]> {
    const rows = await this.db.getAllAsync<CheckInRow>(
      'SELECT * FROM check_ins WHERE patient_id = ? ORDER BY completed_at DESC',
      [patientId],
    );
    return rows.map(toCheckIn);
  }

  async setCheckInSyncStatus(checkInId: string, syncStatus: SyncStatus): Promise<void> {
    await this.db.runAsync('UPDATE check_ins SET sync_status = ? WHERE id = ?', [
      syncStatus,
      checkInId,
    ]);
  }

  async countUnsyncedCheckIns(): Promise<number> {
    const row = await this.db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM check_ins WHERE sync_status != 'synced'",
    );
    return row?.count ?? 0;
  }

  async listDueOperations(nowIso: string): Promise<OutboxOperation[]> {
    const rows = await this.db.getAllAsync<OutboxRow>(
      "SELECT * FROM outbox WHERE status = 'pending' AND next_attempt_at <= ? ORDER BY created_at ASC",
      [nowIso],
    );
    return rows.map(toOperation);
  }

  async findOperationByKey(idempotencyKey: string): Promise<OutboxOperation | undefined> {
    const row = await this.db.getFirstAsync<OutboxRow>(
      'SELECT * FROM outbox WHERE idempotency_key = ?',
      [idempotencyKey],
    );
    return row ? toOperation(row) : undefined;
  }

  async listOperations(): Promise<OutboxOperation[]> {
    const rows = await this.db.getAllAsync<OutboxRow>(
      'SELECT * FROM outbox ORDER BY created_at ASC',
    );
    return rows.map(toOperation);
  }

  /** Only retry bookkeeping changes; the payload is never rewritten. */
  async updateOperation(operation: OutboxOperation): Promise<void> {
    await this.db.runAsync(
      'UPDATE outbox SET attempts = ?, next_attempt_at = ?, status = ?, last_error = ? WHERE id = ?',
      [
        operation.attempts,
        operation.nextAttemptAt,
        operation.status,
        operation.lastError ?? null,
        operation.id,
      ],
    );
  }

  async cacheActiveCarePlan(cached: CachedCarePlan): Promise<void> {
    await this.db.runAsync(
      `INSERT OR REPLACE INTO cached_care_plans (patient_id, care_plan_json, template_json, cached_at)
       VALUES (?, ?, ?, ?)`,
      [
        cached.patientId,
        JSON.stringify(cached.carePlan),
        JSON.stringify(cached.template),
        cached.cachedAt,
      ],
    );
  }

  async getCachedActiveCarePlan(patientId: string): Promise<CachedCarePlan | undefined> {
    const row = await this.db.getFirstAsync<CachedPlanRow>(
      'SELECT * FROM cached_care_plans WHERE patient_id = ?',
      [patientId],
    );
    if (!row) {
      return undefined;
    }
    return {
      patientId: row.patient_id,
      carePlan: JSON.parse(row.care_plan_json),
      template: JSON.parse(row.template_json),
      cachedAt: row.cached_at,
    };
  }
}
