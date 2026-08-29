/**
 * Typed repository interface.
 *
 * Screens never read seed JSON or SQLite directly: UI → feature/domain
 * services → this interface. `DemoRepository` backs the hackathon build with
 * validated synthetic data; `ApiRepository` is the typed adapter for the
 * future backend (API contract in the specification §15).
 */
import type {
  Alert,
  AgentApproval,
  AgentRun,
  CarePassportSnapshot,
  CarePlan,
  CarePlanTemplate,
  CheckInResponse,
  Clinic,
  Clinician,
  ClinicalRecord,
  ClinicianDecision,
  PassportAccessEvent,
  Patient,
  RecordProvenance,
  ShareGrant,
  SyntheticFollowUpCase,
  User,
} from '../domain/models';

export interface CreateShareGrantInput {
  patientId: string;
  tokenHash: string;
  categories: ShareGrant['categories'];
  purpose: string;
  expiresAt: string;
  maxUses: number;
}

export interface Repository {
  // Identity
  getUsers(): Promise<User[]>;
  getClinic(clinicId: string): Promise<Clinic | undefined>;
  getClinicians(): Promise<Clinician[]>;

  // Patients and plans
  getPatients(): Promise<Patient[]>;
  getPatient(patientId: string): Promise<Patient | undefined>;
  getCarePlanTemplates(): Promise<CarePlanTemplate[]>;
  getActiveCarePlan(patientId: string): Promise<CarePlan | undefined>;

  // Follow-up
  getRecentCheckIns(patientId: string, limit?: number): Promise<CheckInResponse[]>;
  getFollowUpCases(): Promise<SyntheticFollowUpCase[]>;
  getAlerts(): Promise<Alert[]>;
  saveClinicianDecision(decision: ClinicianDecision): Promise<void>;
  getClinicianDecisions(alertId: string): Promise<ClinicianDecision[]>;

  // Care Passport
  getPassportSnapshot(patientId: string): Promise<CarePassportSnapshot | undefined>;
  getClinicalRecords(patientId: string): Promise<ClinicalRecord[]>;
  getRecordProvenance(recordIds: readonly string[]): Promise<RecordProvenance[]>;
  getShareGrants(patientId: string): Promise<ShareGrant[]>;
  getAllShareGrants(): Promise<ShareGrant[]>;
  createShareGrant(input: CreateShareGrantInput): Promise<ShareGrant>;
  revokeShareGrant(shareGrantId: string, revokedAtIso: string): Promise<ShareGrant | undefined>;
  getPassportAccessEvents(patientId: string): Promise<PassportAccessEvent[]>;
  recordPassportAccessEvent(event: PassportAccessEvent): Promise<void>;

  // Agent
  getAgentRuns(): Promise<AgentRun[]>;
  getAgentRun(agentRunId: string): Promise<AgentRun | undefined>;
  getAgentApprovals(agentRunId: string): Promise<AgentApproval[]>;
}
