/**
 * Record authority, verification-state transitions, conflicts, and patient
 * corrections.
 *
 * Invariants:
 * - `patient_reported` and `ai_organized` records can never become
 *   `clinician_verified` through an agent action.
 * - Conflicting records are preserved and linked, never resolved by
 *   last-write-wins.
 * - A patient correction is a new record that disputes the source record; the
 *   source record is never overwritten.
 */
import type {
  ClinicalRecord,
  MedicationHistoryRecord,
  RecordSourceType,
  VerificationStatus,
} from './models';

export type PromotionActor = 'agent' | 'clinician' | 'patient' | 'system';

/**
 * May `actor` change a record's source authority from `from` to `to`?
 * The agent may never promote anything. Only an authenticated clinician can
 * verify, and even a clinician cannot relabel patient-reported or AI-organized
 * content as clinician-verified — they author a new clinician_verified record
 * that supersedes or confirms it instead.
 */
export function canPromoteSourceType(
  actor: PromotionActor,
  from: RecordSourceType,
  to: RecordSourceType,
): boolean {
  if (from === to) {
    return true;
  }
  // No actor may relabel an existing record's source authority in place.
  return false;
}

const VERIFICATION_TRANSITIONS: Record<VerificationStatus, VerificationStatus[]> = {
  unverified: ['pending', 'disputed', 'superseded'],
  pending: ['verified', 'disputed', 'superseded'],
  verified: ['disputed', 'superseded'],
  disputed: ['verified', 'superseded'],
  superseded: [],
};

export function canTransitionVerification(
  actor: PromotionActor,
  from: VerificationStatus,
  to: VerificationStatus,
): boolean {
  if (actor === 'agent' && to === 'verified') {
    return false; // The agent can never verify a record.
  }
  if (actor === 'patient' && to === 'verified') {
    return false;
  }
  return VERIFICATION_TRANSITIONS[from].includes(to);
}

/**
 * Group records that make conflicting claims about the same subject. Currently
 * detects medication-status conflicts: two non-superseded records about the
 * same medication with different statuses. Groups are returned for human
 * reconciliation; nothing is resolved automatically.
 */
export function findRecordConflicts(records: readonly ClinicalRecord[]): string[][] {
  const byMedication = new Map<string, MedicationHistoryRecord[]>();
  for (const record of records) {
    if (record.category !== 'medications' || record.verificationStatus === 'superseded') {
      continue;
    }
    const key = record.medicationName.trim().toLowerCase();
    const bucket = byMedication.get(key) ?? [];
    bucket.push(record);
    byMedication.set(key, bucket);
  }

  const conflicts: string[][] = [];
  for (const bucket of byMedication.values()) {
    if (bucket.length < 2) {
      continue;
    }
    const statuses = new Set(bucket.map((r) => r.status));
    if (statuses.size > 1) {
      conflicts.push(bucket.map((r) => r.id).sort());
    }
  }
  return conflicts;
}

/**
 * Create a patient correction for an existing record. Returns the new
 * patient-reported record and the (unchanged, only re-flagged) source record.
 * The source record's content is never modified.
 */
export function createPatientCorrection<T extends ClinicalRecord>(
  source: T,
  correction: Omit<T, 'id' | 'sourceType' | 'verificationStatus' | 'disputesRecordId'>,
  newRecordId: string,
): { correctionRecord: T; disputedSource: T } {
  const correctionRecord = {
    ...correction,
    id: newRecordId,
    sourceType: 'patient_reported',
    verificationStatus: 'disputed',
    disputesRecordId: source.id,
  } as T;

  const disputedSource = {
    ...source,
    verificationStatus: 'disputed',
  } as T;

  return { correctionRecord, disputedSource };
}
