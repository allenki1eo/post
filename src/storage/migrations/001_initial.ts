/**
 * Migration 001 — initial local schema.
 *
 * Migrations are append-only: never edit a shipped migration, add a new one.
 */
export const MIGRATION_001_INITIAL = `
CREATE TABLE IF NOT EXISTS check_ins (
  id TEXT PRIMARY KEY NOT NULL,
  schedule_id TEXT NOT NULL,
  care_plan_id TEXT NOT NULL,
  patient_id TEXT NOT NULL,
  answers_json TEXT NOT NULL,
  expected_dose_ids_json TEXT NOT NULL,
  confirmed_dose_ids_json TEXT NOT NULL,
  patient_note TEXT,
  completed_at TEXT NOT NULL,
  device_created_at TEXT NOT NULL,
  sync_status TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_check_ins_patient ON check_ins (patient_id, completed_at);
CREATE INDEX IF NOT EXISTS idx_check_ins_sync ON check_ins (sync_status);

CREATE TABLE IF NOT EXISTS outbox (
  id TEXT PRIMARY KEY NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  check_in_id TEXT,
  created_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TEXT NOT NULL,
  status TEXT NOT NULL,
  last_error TEXT
);

CREATE INDEX IF NOT EXISTS idx_outbox_due ON outbox (status, next_attempt_at);

CREATE TABLE IF NOT EXISTS cached_care_plans (
  patient_id TEXT PRIMARY KEY NOT NULL,
  care_plan_json TEXT NOT NULL,
  template_json TEXT NOT NULL,
  cached_at TEXT NOT NULL
);
`;

export const MIGRATIONS: { version: number; sql: string }[] = [
  { version: 1, sql: MIGRATION_001_INITIAL },
];
