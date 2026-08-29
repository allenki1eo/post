/**
 * Pure FHIR R4 mapping functions.
 *
 * POST keeps an internal canonical model and maps toward FHIR R4 as a
 * compatibility direction. This is NOT a claim of FHIR or IPS certification
 * or conformance. Rules:
 * - pure functions with no I/O;
 * - source identifiers, source authority, and verification state are
 *   preserved through every mapping (meta.tag + identifier);
 * - raw FHIR payloads are never handed to screen components.
 */
import type {
  AllergyRecord,
  ClinicalRecord,
  MedicationHistoryRecord,
  Patient,
  RecordProvenance,
  ShareGrant,
  SupportedLanguage,
} from '../domain/models';

export const POST_SOURCE_TYPE_SYSTEM = 'https://post.example/fhir/source-type';
export const POST_VERIFICATION_SYSTEM = 'https://post.example/fhir/verification-status';
export const POST_RECORD_ID_SYSTEM = 'https://post.example/fhir/record-id';
export const SYNTHETIC_TAG_SYSTEM = 'https://post.example/fhir/synthetic';

export interface FhirCoding {
  system?: string;
  code?: string;
  display?: string;
}

export interface FhirResource {
  resourceType: string;
  id?: string;
  meta?: { tag?: FhirCoding[] };
  identifier?: { system?: string; value?: string }[];
  [key: string]: unknown;
}

function metaTags(record: ClinicalRecord): { tag: FhirCoding[] } {
  return {
    tag: [
      { system: POST_SOURCE_TYPE_SYSTEM, code: record.sourceType },
      { system: POST_VERIFICATION_SYSTEM, code: record.verificationStatus },
      ...(record.synthetic ? [{ system: SYNTHETIC_TAG_SYSTEM, code: 'synthetic' }] : []),
    ],
  };
}

function identifiers(record: ClinicalRecord): { system?: string; value?: string }[] {
  const ids: { system?: string; value?: string }[] = [
    { system: POST_RECORD_ID_SYSTEM, value: record.id },
  ];
  if (record.sourceRecordIdentifier) {
    ids.push({ system: record.sourceOrganizationId, value: record.sourceRecordIdentifier });
  }
  return ids;
}

function localized(text: { en: string; sw: string }, language: SupportedLanguage): string {
  return text[language];
}

export function mapPatient(patient: Patient): FhirResource {
  return {
    resourceType: 'Patient',
    id: patient.id,
    meta: {
      tag: patient.synthetic ? [{ system: SYNTHETIC_TAG_SYSTEM, code: 'synthetic' }] : [],
    },
    name: [{ text: patient.preferredName }],
    ...(patient.externalReference ? { identifier: [{ value: patient.externalReference }] } : {}),
  };
}

const MEDICATION_STATUS_TO_FHIR: Record<MedicationHistoryRecord['status'], string> = {
  active: 'active',
  completed: 'completed',
  stopped: 'stopped',
  unknown: 'unknown',
};

export function mapMedicationRecord(record: MedicationHistoryRecord): FhirResource {
  return {
    resourceType: 'MedicationStatement',
    id: record.id,
    meta: metaTags(record),
    identifier: identifiers(record),
    status: MEDICATION_STATUS_TO_FHIR[record.status],
    medicationCodeableConcept: { text: record.medicationName },
    subject: { reference: `Patient/${record.patientId}` },
    dateAsserted: record.recordedAt,
    ...(record.effectiveStartsAt
      ? { effectivePeriod: { start: record.effectiveStartsAt, end: record.effectiveEndsAt } }
      : {}),
    ...(record.clinicianInstructions
      ? { dosage: [{ text: record.clinicianInstructions.en }] }
      : {}),
  };
}

/**
 * Reverse mapping used by the round-trip fixture tests. Only defined for the
 * fields the forward mapping emits; anything else is out of scope for M1.
 */
export function unmapMedicationStatement(
  resource: FhirResource,
): Pick<
  MedicationHistoryRecord,
  | 'id'
  | 'patientId'
  | 'medicationName'
  | 'status'
  | 'recordedAt'
  | 'sourceType'
  | 'verificationStatus'
> {
  const tags = resource.meta?.tag ?? [];
  const findTag = (system: string) => tags.find((t) => t.system === system)?.code;
  const subject = resource.subject as { reference?: string } | undefined;
  const medication = resource.medicationCodeableConcept as { text?: string } | undefined;
  const status = Object.entries(MEDICATION_STATUS_TO_FHIR).find(
    ([, fhir]) => fhir === resource.status,
  )?.[0] as MedicationHistoryRecord['status'] | undefined;
  if (!resource.id || !subject?.reference || !medication?.text || !status) {
    throw new Error('MedicationStatement is missing fields required for round-trip');
  }
  return {
    id: resource.id,
    patientId: subject.reference.replace('Patient/', ''),
    medicationName: medication.text,
    status,
    recordedAt: String(resource.dateAsserted),
    sourceType: (findTag(POST_SOURCE_TYPE_SYSTEM) ??
      'facility_imported') as MedicationHistoryRecord['sourceType'],
    verificationStatus: (findTag(POST_VERIFICATION_SYSTEM) ??
      'unverified') as MedicationHistoryRecord['verificationStatus'],
  };
}

export function mapAllergyRecord(
  record: AllergyRecord,
  language: SupportedLanguage = 'en',
): FhirResource {
  return {
    resourceType: 'AllergyIntolerance',
    id: record.id,
    meta: metaTags(record),
    identifier: identifiers(record),
    clinicalStatus: {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical',
          code: record.clinicalStatus === 'unknown' ? 'active' : record.clinicalStatus,
        },
      ],
    },
    code: { text: record.substance },
    patient: { reference: `Patient/${record.patientId}` },
    recordedDate: record.recordedAt,
    ...(record.reaction
      ? { reaction: [{ description: localized(record.reaction, language) }] }
      : {}),
  };
}

export function mapClinicalRecord(
  record: ClinicalRecord,
  language: SupportedLanguage = 'en',
): FhirResource {
  switch (record.category) {
    case 'medications':
      return mapMedicationRecord(record);
    case 'allergies':
      return mapAllergyRecord(record, language);
    case 'conditions':
      return {
        resourceType: 'Condition',
        id: record.id,
        meta: metaTags(record),
        identifier: identifiers(record),
        code: { text: localized(record.conditionName, language) },
        subject: { reference: `Patient/${record.patientId}` },
        recordedDate: record.recordedAt,
      };
    case 'encounters':
      return {
        resourceType: 'Encounter',
        id: record.id,
        meta: metaTags(record),
        identifier: identifiers(record),
        status: 'finished',
        class: { text: localized(record.encounterType, language) },
        subject: { reference: `Patient/${record.patientId}` },
        ...(record.facilityName ? { serviceProvider: { display: record.facilityName } } : {}),
      };
    case 'procedures':
      return {
        resourceType: 'Procedure',
        id: record.id,
        meta: metaTags(record),
        identifier: identifiers(record),
        status: 'completed',
        code: { text: localized(record.procedureName, language) },
        subject: { reference: `Patient/${record.patientId}` },
      };
    case 'observations':
      return {
        resourceType: 'Observation',
        id: record.id,
        meta: metaTags(record),
        identifier: identifiers(record),
        status: 'final',
        code: { text: localized(record.observationName, language) },
        subject: { reference: `Patient/${record.patientId}` },
        // A missing value stays missing: dataAbsentReason instead of invention.
        ...(record.value !== undefined
          ? { valueString: record.unit ? `${record.value} ${record.unit}` : record.value }
          : { dataAbsentReason: { coding: [{ code: 'unknown' }], text: 'not available' } }),
      };
    case 'documents':
      return {
        resourceType: 'DocumentReference',
        id: record.id,
        meta: metaTags(record),
        identifier: identifiers(record),
        status: 'current',
        description: localized(record.title, language),
        subject: { reference: `Patient/${record.patientId}` },
      };
    case 'clinician_advice':
    case 'care_plans':
      return {
        resourceType: 'CarePlan',
        id: record.id,
        meta: metaTags(record),
        identifier: identifiers(record),
        status: record.status === 'active' ? 'active' : 'completed',
        intent: 'plan',
        description:
          record.category === 'clinician_advice'
            ? localized(record.advice, language)
            : localized(record.planName, language),
        subject: { reference: `Patient/${record.patientId}` },
      };
    case 'important_alerts':
      return {
        resourceType: 'Flag',
        id: record.id,
        meta: metaTags(record),
        identifier: identifiers(record),
        status: 'active',
        code: { text: localized(record.title, language) },
        subject: { reference: `Patient/${record.patientId}` },
      };
  }
}

export function mapProvenance(provenance: RecordProvenance): FhirResource {
  return {
    resourceType: 'Provenance',
    id: provenance.id,
    target: [{ reference: `${POST_RECORD_ID_SYSTEM}|${provenance.recordId}` }],
    recorded: provenance.occurredAt,
    activity: { text: provenance.activity },
    agent: [
      {
        who: provenance.actorId
          ? { reference: provenance.actorId }
          : { display: provenance.organizationId ?? 'unknown' },
      },
    ],
  };
}

export function mapShareGrantToConsent(grant: ShareGrant): FhirResource {
  return {
    resourceType: 'Consent',
    id: grant.id,
    status: grant.revokedAt ? 'inactive' : 'active',
    scope: { coding: [{ code: 'patient-privacy' }] },
    patient: { reference: `Patient/${grant.patientId}` },
    dateTime: grant.confirmedAt,
    provision: {
      type: 'permit',
      period: { start: grant.startsAt, end: grant.expiresAt },
      purpose: [{ display: grant.purpose }],
      class: grant.categories.map((category) => ({ code: category })),
    },
  };
}
