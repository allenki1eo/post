import type { ClinicalRecord, ShareGrant } from '../src/domain/models';
import {
  assertQrPayloadIsOpaque,
  buildQrPayload,
  evaluateGrantAccess,
  filterRecordsForGrant,
  hashShareToken,
  issueShareToken,
} from '../src/domain/passport';
import { sha256Hex } from '../src/utils/sha256';

const NOW = '2026-08-25T09:00:00.000Z';

function makeGrant(partial: Partial<ShareGrant> = {}): ShareGrant {
  const token = 'POSTTESTTOKENAAAAAAAAA23';
  return {
    id: 'grant-1',
    patientId: 'patient-1',
    tokenHash: hashShareToken(token),
    categories: ['medications', 'allergies'],
    purpose: 'test',
    startsAt: '2026-08-25T08:00:00.000Z',
    expiresAt: '2026-08-25T10:00:00.000Z',
    maxUses: 2,
    useCount: 0,
    createdAt: '2026-08-25T08:00:00.000Z',
    confirmedAt: '2026-08-25T08:00:00.000Z',
    ...partial,
  };
}

const TEST_TOKEN = 'POSTTESTTOKENAAAAAAAAA23';

describe('share tokens', () => {
  it('issues an opaque token and stores only its SHA-256 hash', () => {
    const issued = issueShareToken();
    expect(issued.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(issued.tokenHash).toBe(sha256Hex(issued.plainToken));
    expect(issued.plainToken).not.toContain(issued.tokenHash);
  });

  it('produces a QR payload containing only the opaque token alphabet', () => {
    const issued = issueShareToken();
    const payload = buildQrPayload(issued.plainToken);
    expect(payload).toBe(issued.plainToken);
    expect(() => assertQrPayloadIsOpaque(payload)).not.toThrow();
    // Anything resembling clinical content or identifiers fails the guard.
    expect(() => assertQrPayloadIsOpaque('patient-01:amoxicillin')).toThrow();
    expect(() => assertQrPayloadIsOpaque(JSON.stringify({ patientId: 'p' }))).toThrow();
  });
});

describe('evaluateGrantAccess', () => {
  it('allows a valid token within window and use budget', () => {
    const decision = evaluateGrantAccess([makeGrant()], {
      presentedToken: TEST_TOKEN,
      nowIso: NOW,
    });
    expect(decision).toEqual({
      outcome: 'allowed',
      grantId: 'grant-1',
      patientId: 'patient-1',
      categories: ['medications', 'allergies'],
    });
  });

  it('denies an unknown token without revealing whether any patient exists', () => {
    const decision = evaluateGrantAccess([makeGrant()], {
      presentedToken: 'WRONGTOKENAAAAAAAAAAAA23',
      nowIso: NOW,
    });
    expect(decision).toEqual({ outcome: 'denied' });
  });

  it.each([
    ['expired', makeGrant({ expiresAt: '2026-08-25T08:30:00.000Z' })],
    ['expired', makeGrant({ startsAt: '2026-08-25T09:30:00.000Z' })],
    ['revoked', makeGrant({ revokedAt: '2026-08-25T08:45:00.000Z' })],
    ['over_use_limit', makeGrant({ useCount: 2 })],
  ] as const)('returns non-disclosing %s outcome', (outcome, grant) => {
    const decision = evaluateGrantAccess([grant], { presentedToken: TEST_TOKEN, nowIso: NOW });
    expect(decision.outcome).toBe(outcome);
    expect(decision).not.toHaveProperty('patientId');
    expect(decision).not.toHaveProperty('categories');
  });
});

describe('filterRecordsForGrant', () => {
  const record = (
    id: string,
    patientId: string,
    category: ClinicalRecord['category'],
  ): ClinicalRecord =>
    ({
      id,
      patientId,
      category,
      sourceType: 'clinician_verified',
      verificationStatus: 'verified',
      recordedAt: NOW,
      synthetic: true,
      ...(category === 'medications'
        ? { medicationName: 'X', status: 'active' }
        : { substance: 'Y', clinicalStatus: 'active' }),
    }) as ClinicalRecord;

  it('returns exactly the granted categories for the granted patient', () => {
    const records = [
      record('r1', 'patient-1', 'medications'),
      record('r2', 'patient-1', 'allergies'),
      record('r3', 'patient-2', 'medications'),
    ];
    const filtered = filterRecordsForGrant(records, {
      patientId: 'patient-1',
      categories: ['medications'],
    });
    expect(filtered.map((r) => r.id)).toEqual(['r1']);
  });
});
