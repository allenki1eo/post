/**
 * Loads and validates the bundled synthetic seed data.
 *
 * Every file is parsed with the canonical Zod schemas at first access; a seed
 * that violates a domain invariant (for example a confirmed dose outside the
 * expected set) fails loudly here instead of rendering quietly wrong data.
 */
import { z } from 'zod';

import carePlanTemplatesJson from '../../data/care-plan-templates.json';
import syntheticAgentRunsJson from '../../data/synthetic-agent-runs.json';
import syntheticCasesJson from '../../data/synthetic-cases.json';
import syntheticPassportsJson from '../../data/synthetic-passports.json';
import syntheticPatientsJson from '../../data/synthetic-patients.json';
import {
  CarePlanTemplateSchema,
  ClinicSchema,
  ClinicianSchema,
  PatientSchema,
  SyntheticAgentRunSchema,
  SyntheticFollowUpCaseSchema,
  SyntheticPassportSchema,
  UserSchema,
} from '../domain/schemas';

const TemplatesFileSchema = z.object({
  demoLabel: z.string(),
  templates: z.array(CarePlanTemplateSchema).length(4),
});

const PatientsFileSchema = z.object({
  demoLabel: z.string(),
  clinic: ClinicSchema,
  clinicians: z.array(ClinicianSchema),
  users: z.array(UserSchema),
  patients: z.array(PatientSchema),
});

const CasesFileSchema = z.object({
  demoLabel: z.string(),
  cases: z.array(SyntheticFollowUpCaseSchema).min(12),
});

const PassportsFileSchema = z.object({
  demoLabel: z.string(),
  passports: z.array(SyntheticPassportSchema).min(4),
});

const AgentRunsFileSchema = z.object({
  demoLabel: z.string(),
  agentRuns: z.array(SyntheticAgentRunSchema).min(12),
});

export interface SeedData {
  templates: z.infer<typeof TemplatesFileSchema>['templates'];
  clinic: z.infer<typeof PatientsFileSchema>['clinic'];
  clinicians: z.infer<typeof PatientsFileSchema>['clinicians'];
  users: z.infer<typeof PatientsFileSchema>['users'];
  patients: z.infer<typeof PatientsFileSchema>['patients'];
  cases: z.infer<typeof CasesFileSchema>['cases'];
  passports: z.infer<typeof PassportsFileSchema>['passports'];
  agentRuns: z.infer<typeof AgentRunsFileSchema>['agentRuns'];
}

let cached: SeedData | undefined;

export function loadSeedData(): SeedData {
  if (cached) {
    return cached;
  }
  const templatesFile = TemplatesFileSchema.parse(carePlanTemplatesJson);
  const patientsFile = PatientsFileSchema.parse(syntheticPatientsJson);
  const casesFile = CasesFileSchema.parse(syntheticCasesJson);
  const passportsFile = PassportsFileSchema.parse(syntheticPassportsJson);
  const agentRunsFile = AgentRunsFileSchema.parse(syntheticAgentRunsJson);

  cached = {
    templates: templatesFile.templates,
    clinic: patientsFile.clinic,
    clinicians: patientsFile.clinicians,
    users: patientsFile.users,
    patients: patientsFile.patients,
    cases: casesFile.cases,
    passports: passportsFile.passports,
    agentRuns: agentRunsFile.agentRuns,
  };
  return cached;
}
