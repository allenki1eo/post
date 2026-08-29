import type { MedicationHistoryRecord, ObservationRecord } from '../src/domain/models';
import {
  mapClinicalRecord,
  mapMedicationRecord,
  mapShareGrantToConsent,
  POST_RECORD_ID_SYSTEM,
  POST_SOURCE_TYPE_SYSTEM,
  POST_VERIFICATION_SYSTEM,
  unmapMedicationStatement,
} from '../src/interoperability/fhirR4';
import { buildIpsShapedBundle } from '../src/interoperability/ipsMapper';
import { importClinicalRecords } from '../src/interoperability/validation';
import { loadSeedData } from '../src/repositories/seedLoader';

const seed = loadSeedData();
const passport = seed.passports[0];

const medication: MedicationHistoryRecord = {
  id: 'rec-1',
  patientId: 'patient-1',
  category: 'medications',
  sourceType: 'facility_imported',
  verificationStatus: 'pending',
  sourceOrganizationId: 'facility-2',
  sourceRecordIdentifier: 'ext-123',
  recordedAt: '2026-08-01T10:00:00.000Z',
  synthetic: true,
  medicationName: 'Amoxicillin 500 mg',
  status: 'active',
};

describe('FHIR R4 mapping', () => {
  it('maps a medication record to a MedicationStatement preserving source identifiers and authority', () => {
    const resource = mapMedicationRecord(medication);
    expect(resource.resourceType).toBe('MedicationStatement');
    expect(resource.identifier).toContainEqual({ system: POST_RECORD_ID_SYSTEM, value: 'rec-1' });
    expect(resource.identifier).toContainEqual({ system: 'facility-2', value: 'ext-123' });
    expect(resource.meta?.tag).toContainEqual({
      system: POST_SOURCE_TYPE_SYSTEM,
      code: 'facility_imported',
    });
    expect(resource.meta?.tag).toContainEqual({
      system: POST_VERIFICATION_SYSTEM,
      code: 'pending',
    });
  });

  it('round-trips the reversible medication fields exactly', () => {
    const roundTripped = unmapMedicationStatement(mapMedicationRecord(medication));
    expect(roundTripped).toEqual({
      id: medication.id,
      patientId: medication.patientId,
      medicationName: medication.medicationName,
      status: medication.status,
      recordedAt: medication.recordedAt,
      sourceType: medication.sourceType,
      verificationStatus: medication.verificationStatus,
    });
  });

  it('keeps a missing observation value missing (dataAbsentReason), never invented', () => {
    const observation = passport.records.find(
      (r): r is ObservationRecord =>
        r.category === 'observations' && (r as ObservationRecord).value === undefined,
    )!;
    const resource = mapClinicalRecord(observation);
    expect(resource.valueString).toBeUndefined();
    expect(resource.dataAbsentReason).toBeDefined();
  });

  it('maps a share grant to a Consent scoped to the granted categories and period', () => {
    const grant = passport.shareGrants[0];
    const consent = mapShareGrantToConsent(grant);
    expect(consent.resourceType).toBe('Consent');
    const provision = consent.provision as {
      class: { code: string }[];
      period: { start: string; end: string };
    };
    expect(provision.class.map((c) => c.code)).toEqual(grant.categories);
    expect(provision.period).toEqual({ start: grant.startsAt, end: grant.expiresAt });
  });
});

describe('IPS-shaped export', () => {
  const bundle = buildIpsShapedBundle(
    passport.patient,
    passport.snapshot,
    passport.records,
    passport.provenance,
  );
  const entries = bundle.entry as { resource: { resourceType: string; id?: string } }[];

  it('produces a document Bundle with a Composition first', () => {
    expect(bundle.resourceType).toBe('Bundle');
    expect(bundle.type).toBe('document');
    expect(entries[0].resource.resourceType).toBe('Composition');
  });

  it('does not claim IPS conformance in the composition title', () => {
    const composition = entries[0].resource as unknown as { title: string };
    expect(composition.title).toContain('not a certified IPS document');
  });

  it('includes every snapshot record and its provenance', () => {
    const ids = new Set(entries.map((e) => e.resource.id));
    for (const recordId of passport.snapshot.recordIds) {
      expect(ids.has(recordId)).toBe(true);
    }
    expect(entries.filter((e) => e.resource.resourceType === 'Provenance').length).toBe(
      passport.provenance.length,
    );
  });

  it('supports Kiswahili section titles', () => {
    const swBundle = buildIpsShapedBundle(
      passport.patient,
      passport.snapshot,
      passport.records,
      passport.provenance,
      { language: 'sw' },
    );
    const composition = (
      swBundle.entry as { resource: { section?: { title: string }[]; title?: string } }[]
    )[0].resource;
    expect(composition.section?.some((s) => s.title === 'Muhtasari wa Dawa')).toBe(true);
  });
});

describe('import quarantine', () => {
  it('accepts well-formed facility imports and quarantines everything else, never partially', () => {
    const good = { ...medication, id: 'rec-good' };
    const malformed = { id: 'rec-bad', category: 'medications' };
    const wrongAuthority = { ...medication, id: 'rec-authority', sourceType: 'clinician_verified' };
    const preVerified = { ...medication, id: 'rec-preverified', verificationStatus: 'verified' };

    const result = importClinicalRecords([good, malformed, wrongAuthority, preVerified]);
    expect(result.accepted.map((r) => r.id)).toEqual(['rec-good']);
    expect(result.quarantined).toHaveLength(3);
    for (const quarantined of result.quarantined) {
      expect(quarantined.issues.length).toBeGreaterThan(0);
    }
  });
});
