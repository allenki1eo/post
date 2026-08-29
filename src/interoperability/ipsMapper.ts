/**
 * IPS-shaped document bundle for a Care Passport snapshot.
 *
 * The output follows the shape of an HL7 International Patient Summary
 * document Bundle (Composition first, sectioned by category, followed by the
 * referenced resources). It is a compatibility direction only — POST does not
 * claim IPS conformance or certification, and the bundle says so in its
 * Composition title.
 */
import type {
  CarePassportSnapshot,
  ClinicalRecord,
  PassportCategory,
  Patient,
  RecordProvenance,
  SupportedLanguage,
} from '../domain/models';
import { mapClinicalRecord, mapPatient, mapProvenance, type FhirResource } from './fhirR4';

const SECTION_TITLES: Record<PassportCategory, { en: string; sw: string }> = {
  important_alerts: { en: 'Alerts', sw: 'Tahadhari' },
  medications: { en: 'Medication Summary', sw: 'Muhtasari wa Dawa' },
  allergies: { en: 'Allergies and Intolerances', sw: 'Aleji na Kutovumilia' },
  conditions: { en: 'Problem List', sw: 'Orodha ya Matatizo' },
  encounters: { en: 'History of Encounters', sw: 'Historia ya Ziara' },
  procedures: { en: 'History of Procedures', sw: 'Historia ya Taratibu' },
  care_plans: { en: 'Care Plans', sw: 'Mipango ya Huduma' },
  clinician_advice: { en: 'Clinician Advice', sw: 'Ushauri wa Tabibu' },
  observations: { en: 'Results', sw: 'Matokeo' },
  documents: { en: 'Documents', sw: 'Nyaraka' },
};

export interface IpsExportOptions {
  language?: SupportedLanguage;
}

export function buildIpsShapedBundle(
  patient: Patient,
  snapshot: CarePassportSnapshot,
  records: readonly ClinicalRecord[],
  provenance: readonly RecordProvenance[],
  options: IpsExportOptions = {},
): FhirResource {
  const language = options.language ?? 'en';
  const included = records.filter((r) => snapshot.recordIds.includes(r.id));

  const byCategory = new Map<PassportCategory, ClinicalRecord[]>();
  for (const record of included) {
    const bucket = byCategory.get(record.category) ?? [];
    bucket.push(record);
    byCategory.set(record.category, bucket);
  }

  const sections = [...byCategory.entries()].map(([category, categoryRecords]) => ({
    title: SECTION_TITLES[category][language],
    code: { coding: [{ system: 'https://post.example/fhir/passport-category', code: category }] },
    entry: categoryRecords.map((record) => ({
      reference: `${mapClinicalRecord(record).resourceType}/${record.id}`,
    })),
  }));

  const composition: FhirResource = {
    resourceType: 'Composition',
    id: `composition-${snapshot.id}`,
    status: 'preliminary',
    type: {
      coding: [
        { system: 'http://loinc.org', code: '60591-5', display: 'Patient summary Document' },
      ],
    },
    subject: { reference: `Patient/${patient.id}` },
    date: snapshot.generatedAt,
    title:
      language === 'sw'
        ? 'Muhtasari wa mgonjwa (mfano wa POST, si hati iliyothibitishwa ya IPS)'
        : 'Patient summary (POST demo, not a certified IPS document)',
    section: sections,
  };

  const resourceEntries: FhirResource[] = [
    composition,
    mapPatient(patient),
    ...included.map((record) => mapClinicalRecord(record, language)),
    ...provenance
      .filter((p) => snapshot.recordIds.includes(p.recordId))
      .map((p) => mapProvenance(p)),
  ];

  return {
    resourceType: 'Bundle',
    id: `ips-${snapshot.id}`,
    type: 'document',
    timestamp: snapshot.generatedAt,
    entry: resourceEntries.map((resource) => ({ resource })),
  };
}
