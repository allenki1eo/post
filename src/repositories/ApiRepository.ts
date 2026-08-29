/**
 * Typed adapter for the future POST backend (specification §15).
 *
 * Deliberately stubbed for the hackathon: every method maps to a conceptual
 * endpoint and fails with `ApiNotConfiguredError` until a backend exists.
 * Keeping the mapping here (instead of inside screens) preserves a clean
 * production path: swap `DemoRepository` for `ApiRepository` at the
 * `getRepository()` seam without touching UI code.
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
import type { CreateShareGrantInput, Repository } from './Repository';

export class ApiNotConfiguredError extends Error {
  constructor(endpoint: string) {
    super(
      `ApiRepository is not configured (EXPO_PUBLIC_API_BASE_URL is empty). Endpoint: ${endpoint}`,
    );
    this.name = 'ApiNotConfiguredError';
  }
}

export class ApiRepository implements Repository {
  constructor(private readonly baseUrl: string | undefined) {}

  private fail(endpoint: string): never {
    throw new ApiNotConfiguredError(endpoint);
  }

  async getUsers(): Promise<User[]> {
    return this.fail('GET /me');
  }
  async getClinic(): Promise<Clinic | undefined> {
    return this.fail('GET /me');
  }
  async getClinicians(): Promise<Clinician[]> {
    return this.fail('GET /me');
  }
  async getPatients(): Promise<Patient[]> {
    return this.fail('GET /patients');
  }
  async getPatient(patientId: string): Promise<Patient | undefined> {
    return this.fail(`GET /patients/${patientId}`);
  }
  async getCarePlanTemplates(): Promise<CarePlanTemplate[]> {
    return this.fail('GET /care-plan-templates');
  }
  async getActiveCarePlan(patientId: string): Promise<CarePlan | undefined> {
    return this.fail(`GET /patients/${patientId}/care-plans/active`);
  }
  async getRecentCheckIns(patientId: string): Promise<CheckInResponse[]> {
    return this.fail(`GET /patients/${patientId}/check-ins`);
  }
  async getFollowUpCases(): Promise<SyntheticFollowUpCase[]> {
    return this.fail('GET /patients (synthetic cases are demo-only)');
  }
  async getAlerts(): Promise<Alert[]> {
    return this.fail('GET /alerts');
  }
  async saveClinicianDecision(decision: ClinicianDecision): Promise<void> {
    return this.fail(`POST /alerts/${decision.alertId}/decisions`);
  }
  async getClinicianDecisions(alertId: string): Promise<ClinicianDecision[]> {
    return this.fail(`GET /alerts/${alertId}`);
  }
  async getPassportSnapshot(patientId: string): Promise<CarePassportSnapshot | undefined> {
    return this.fail(`GET /patients/${patientId}/care-passport`);
  }
  async getClinicalRecords(patientId: string): Promise<ClinicalRecord[]> {
    return this.fail(`GET /patients/${patientId}/clinical-records`);
  }
  async getRecordProvenance(): Promise<RecordProvenance[]> {
    return this.fail('GET /patients/:patientId/clinical-records');
  }
  async getShareGrants(patientId: string): Promise<ShareGrant[]> {
    return this.fail(`GET /patients/${patientId}/share-grants`);
  }
  async getAllShareGrants(): Promise<ShareGrant[]> {
    return this.fail('GET /patients/:patientId/share-grants');
  }
  async createShareGrant(input: CreateShareGrantInput): Promise<ShareGrant> {
    return this.fail(`POST /patients/${input.patientId}/share-grants`);
  }
  async revokeShareGrant(shareGrantId: string): Promise<ShareGrant | undefined> {
    return this.fail(`POST /share-grants/${shareGrantId}/revoke`);
  }
  async getPassportAccessEvents(patientId: string): Promise<PassportAccessEvent[]> {
    return this.fail(`GET /patients/${patientId}/passport-access-events`);
  }
  async recordPassportAccessEvent(): Promise<void> {
    return this.fail('POST /shared-passports/resolve');
  }
  async getAgentRuns(): Promise<AgentRun[]> {
    return this.fail('GET /agent-runs');
  }
  async getAgentRun(agentRunId: string): Promise<AgentRun | undefined> {
    return this.fail(`GET /agent-runs/${agentRunId}`);
  }
  async getAgentApprovals(agentRunId: string): Promise<AgentApproval[]> {
    return this.fail(`GET /agent-runs/${agentRunId}`);
  }
}
