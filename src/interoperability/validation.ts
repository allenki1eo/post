/**
 * Import validation and quarantine.
 *
 * Malformed or unsupported imports are rejected into a quarantine list with
 * their issues — never partially accepted, never silently discarded. Accepted
 * records always carry `facility_imported` source authority and start
 * `unverified` unless the import explicitly carries a stronger, allowed
 * verification state.
 */
import { z } from 'zod';

import type { ClinicalRecord } from '../domain/models';
import { ClinicalRecordSchema } from '../domain/schemas';

export interface QuarantinedImport {
  raw: unknown;
  issues: string[];
}

export interface ImportResult {
  accepted: ClinicalRecord[];
  quarantined: QuarantinedImport[];
}

export function importClinicalRecords(rawRecords: readonly unknown[]): ImportResult {
  const accepted: ClinicalRecord[] = [];
  const quarantined: QuarantinedImport[] = [];

  for (const raw of rawRecords) {
    const parsed = ClinicalRecordSchema.safeParse(raw);
    if (!parsed.success) {
      quarantined.push({ raw, issues: parsed.error.issues.map(formatIssue) });
      continue;
    }
    const record = parsed.data;
    if (record.sourceType !== 'facility_imported') {
      quarantined.push({
        raw,
        issues: [
          `imported records must carry facility_imported source authority (got ${record.sourceType})`,
        ],
      });
      continue;
    }
    if (record.verificationStatus === 'verified') {
      quarantined.push({
        raw,
        issues: ['an import cannot arrive pre-verified; verification requires a local clinician'],
      });
      continue;
    }
    accepted.push(record);
  }

  return { accepted, quarantined };
}

function formatIssue(issue: z.core.$ZodIssue): string {
  return `${issue.path.join('.') || '(root)'}: ${issue.message}`;
}
