import type { MedicationHistoryRecord } from '../src/domain/models';
import {
  canPromoteSourceType,
  canTransitionVerification,
  createPatientCorrection,
  findRecordConflicts,
} from '../src/domain/provenance';

function medication(
  id: string,
  status: MedicationHistoryRecord['status'],
  overrides: Partial<MedicationHistoryRecord> = {},
): MedicationHistoryRecord {
  return {
    id,
    patientId: 'patient-1',
    category: 'medications',
    sourceType: 'clinician_verified',
    verificationStatus: 'verified',
    recordedAt: '2026-08-20T10:00:00.000Z',
    synthetic: true,
    medicationName: 'Amoxicillin 500 mg',
    status,
    ...overrides,
  };
}

describe('source authority', () => {
  it('never lets any actor relabel patient_reported or ai_organized as clinician_verified', () => {
    for (const actor of ['agent', 'clinician', 'patient', 'system'] as const) {
      expect(canPromoteSourceType(actor, 'patient_reported', 'clinician_verified')).toBe(false);
      expect(canPromoteSourceType(actor, 'ai_organized', 'clinician_verified')).toBe(false);
    }
  });

  it('never lets the agent or patient verify a record', () => {
    expect(canTransitionVerification('agent', 'pending', 'verified')).toBe(false);
    expect(canTransitionVerification('patient', 'pending', 'verified')).toBe(false);
    expect(canTransitionVerification('clinician', 'pending', 'verified')).toBe(true);
  });

  it('keeps superseded terminal', () => {
    expect(canTransitionVerification('clinician', 'superseded', 'verified')).toBe(false);
  });
});

describe('findRecordConflicts', () => {
  it('groups conflicting medication statuses for human reconciliation', () => {
    const active = medication('r1', 'active');
    const stopped = medication('r2', 'stopped', {
      sourceType: 'facility_imported',
      verificationStatus: 'pending',
    });
    const unrelated = medication('r3', 'active', { medicationName: 'Metformin 500 mg' });
    expect(findRecordConflicts([active, stopped, unrelated])).toEqual([['r1', 'r2']]);
  });

  it('does not report agreeing or superseded records as conflicts', () => {
    const a = medication('r1', 'active');
    const b = medication('r2', 'active');
    const superseded = medication('r3', 'stopped', { verificationStatus: 'superseded' });
    expect(findRecordConflicts([a, b, superseded])).toEqual([]);
  });
});

describe('createPatientCorrection', () => {
  it('creates a separate disputed patient-reported record and never mutates the source content', () => {
    const source = medication('r1', 'active');
    const { correctionRecord, disputedSource } = createPatientCorrection(
      source,
      { ...source, status: 'stopped' },
      'r-correction',
    );

    expect(correctionRecord.id).toBe('r-correction');
    expect(correctionRecord.sourceType).toBe('patient_reported');
    expect(correctionRecord.verificationStatus).toBe('disputed');
    expect(correctionRecord.disputesRecordId).toBe('r1');
    expect(correctionRecord.status).toBe('stopped');

    // The source keeps its content and authority; only its verification flag
    // moves to disputed.
    expect(disputedSource.status).toBe('active');
    expect(disputedSource.sourceType).toBe('clinician_verified');
    expect(disputedSource.verificationStatus).toBe('disputed');
    // The original object is untouched.
    expect(source.verificationStatus).toBe('verified');
  });
});
