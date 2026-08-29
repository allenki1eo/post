/**
 * In-memory repository over the validated synthetic seed data.
 *
 * Fully offline; the hackathon demo runs against this implementation.
 * Mutations (decisions, share grants, access events) live only in memory for
 * the session — Milestone 2 adds SQLite persistence behind the same interface.
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
import { evaluateWorkflowRules } from '../domain/workflowRules';
import { newId } from '../utils/ids';
import type { CreateShareGrantInput, Repository } from './Repository';
import { loadSeedData, type SeedData } from './seedLoader';

export class DemoRepository implements Repository {
  private readonly seed: SeedData;
  private readonly decisions: ClinicianDecision[] = [];
  private readonly extraGrants: ShareGrant[] = [];
  private readonly extraAccessEvents: PassportAccessEvent[] = [];
  private revokedGrantIds = new Map<string, string>();

  constructor(seed: SeedData = loadSeedData()) {
    this.seed = seed;
  }

  async getUsers(): Promise<User[]> {
    return [...this.seed.users];
  }

  async getClinic(clinicId: string): Promise<Clinic | undefined> {
    return this.seed.clinic.id === clinicId ? this.seed.clinic : undefined;
  }

  async getClinicians(): Promise<Clinician[]> {
    return [...this.seed.clinicians];
  }

  async getPatients(): Promise<Patient[]> {
    return [...this.seed.patients];
  }

  async getPatient(patientId: string): Promise<Patient | undefined> {
    return this.seed.patients.find((p) => p.id === patientId);
  }

  async getCarePlanTemplates(): Promise<CarePlanTemplate[]> {
    return [...this.seed.templates];
  }

  async getActiveCarePlan(patientId: string): Promise<CarePlan | undefined> {
    const plan = this.seed.cases.find((c) => c.patientId === patientId)?.carePlan;
    return plan ? rebaseDemoPlanToToday(plan, new Date().toISOString()) : undefined;
  }

  async getRecentCheckIns(patientId: string, limit = 14): Promise<CheckInResponse[]> {
    return this.seed.cases
      .filter((c) => c.patientId === patientId)
      .flatMap((c) => c.checkIns)
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
      .slice(0, limit);
  }

  async getFollowUpCases(): Promise<SyntheticFollowUpCase[]> {
    return [...this.seed.cases];
  }

  /**
   * Alerts are derived deterministically from the seeded cases by the same
   * rule engine the app uses everywhere, so the review queue always matches
   * the evidence.
   */
  async getAlerts(): Promise<Alert[]> {
    const alerts: Alert[] = [];
    for (const followUpCase of this.seed.cases) {
      const template = this.seed.templates.find((t) => t.id === followUpCase.templateId);
      if (!template) {
        continue;
      }
      const evaluation = evaluateWorkflowRules({
        rules: template.workflowRules,
        checkIns: followUpCase.checkIns,
        triggeringCheckIn: followUpCase.checkIns[followUpCase.checkIns.length - 1],
        missedCheckInScheduleIds: followUpCase.missedCheckInScheduleIds,
      });
      if (evaluation.status === 'on_track') {
        continue;
      }
      for (const match of evaluation.matchedRules) {
        const rule = template.workflowRules.find((r) => r.id === match.ruleId);
        if (!rule) {
          continue;
        }
        alerts.push({
          id: `alert-${followUpCase.id}-${rule.id}`,
          patientId: followUpCase.patientId,
          carePlanId: followUpCase.carePlan.id,
          status: rule.priority === 'urgent' ? 'urgent' : 'review',
          reasonCode: rule.id,
          reasonText: rule.description,
          evidenceReferences: match.evidenceReferences,
          source: 'deterministic_rule',
          reviewState: this.decisions.some(
            (d) => d.alertId === `alert-${followUpCase.id}-${rule.id}`,
          )
            ? 'acknowledged'
            : 'open',
          createdAt:
            followUpCase.checkIns[followUpCase.checkIns.length - 1]?.completedAt ??
            followUpCase.carePlan.startsAt,
        });
      }
    }
    const order = { urgent: 0, review: 1, on_track: 2 } as const;
    return alerts.sort(
      (a, b) => order[a.status] - order[b.status] || a.createdAt.localeCompare(b.createdAt),
    );
  }

  async saveClinicianDecision(decision: ClinicianDecision): Promise<void> {
    this.decisions.push(decision);
  }

  async getClinicianDecisions(alertId: string): Promise<ClinicianDecision[]> {
    return this.decisions.filter((d) => d.alertId === alertId);
  }

  async getPassportSnapshot(patientId: string): Promise<CarePassportSnapshot | undefined> {
    return this.seed.passports.find((p) => p.patient.id === patientId)?.snapshot;
  }

  async getClinicalRecords(patientId: string): Promise<ClinicalRecord[]> {
    return this.seed.passports.find((p) => p.patient.id === patientId)?.records ?? [];
  }

  async getRecordProvenance(recordIds: readonly string[]): Promise<RecordProvenance[]> {
    const wanted = new Set(recordIds);
    return this.seed.passports
      .flatMap((p) => p.provenance)
      .filter((prov) => wanted.has(prov.recordId));
  }

  async getShareGrants(patientId: string): Promise<ShareGrant[]> {
    return (await this.getAllShareGrants()).filter((g) => g.patientId === patientId);
  }

  async getAllShareGrants(): Promise<ShareGrant[]> {
    const seeded = this.seed.passports.flatMap((p) => p.shareGrants);
    return [...seeded, ...this.extraGrants].map((grant) => {
      const revokedAt = this.revokedGrantIds.get(grant.id);
      return revokedAt ? { ...grant, revokedAt } : grant;
    });
  }

  async createShareGrant(input: CreateShareGrantInput): Promise<ShareGrant> {
    const nowIso = new Date().toISOString();
    const grant: ShareGrant = {
      id: newId(),
      patientId: input.patientId,
      tokenHash: input.tokenHash,
      categories: input.categories,
      purpose: input.purpose,
      startsAt: nowIso,
      expiresAt: input.expiresAt,
      maxUses: input.maxUses,
      useCount: 0,
      createdAt: nowIso,
      confirmedAt: nowIso,
    };
    this.extraGrants.push(grant);
    return grant;
  }

  async revokeShareGrant(
    shareGrantId: string,
    revokedAtIso: string,
  ): Promise<ShareGrant | undefined> {
    const all = await this.getAllShareGrants();
    const grant = all.find((g) => g.id === shareGrantId);
    if (!grant) {
      return undefined;
    }
    this.revokedGrantIds.set(shareGrantId, revokedAtIso);
    return { ...grant, revokedAt: revokedAtIso };
  }

  async getPassportAccessEvents(patientId: string): Promise<PassportAccessEvent[]> {
    const grantIds = new Set((await this.getShareGrants(patientId)).map((g) => g.id));
    const seeded = this.seed.passports.flatMap((p) => p.accessEvents);
    return [...seeded, ...this.extraAccessEvents]
      .filter((e) => grantIds.has(e.shareGrantId))
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  }

  async recordPassportAccessEvent(event: PassportAccessEvent): Promise<void> {
    this.extraAccessEvents.push(event);
  }

  async getAgentRuns(): Promise<AgentRun[]> {
    return this.seed.agentRuns.map((fixture) => fixture.run);
  }

  async getAgentRun(agentRunId: string): Promise<AgentRun | undefined> {
    return (await this.getAgentRuns()).find((run) => run.id === agentRunId);
  }

  async getAgentApprovals(agentRunId: string): Promise<AgentApproval[]> {
    const fixture = this.seed.agentRuns.find((f) => f.run.id === agentRunId);
    return fixture ? [...fixture.approvals] : [];
  }
}

/**
 * DEMO ONLY: shift a seeded plan's window so the synthetic patient is always
 * mid-plan, whatever day the demo is run. The seed files stay fixed (the
 * evaluation cases depend on their exact dates); only the plan window and its
 * medication schedule move, so today always has scheduled doses and a check-in
 * to complete. A real deployment never rewrites plan dates.
 */
export function rebaseDemoPlanToToday(plan: CarePlan, nowIso: string): CarePlan {
  const dayMs = 86_400_000;
  const startOfToday = Math.floor(Date.parse(nowIso) / dayMs) * dayMs;
  // Put "today" on day 2, so the plan is visibly in progress.
  const shift = startOfToday - dayMs - Math.floor(Date.parse(plan.startsAt) / dayMs) * dayMs;
  if (shift <= 0) {
    return plan;
  }
  const move = (iso: string) => new Date(Date.parse(iso) + shift).toISOString();
  return {
    ...plan,
    startsAt: move(plan.startsAt),
    ...(plan.endsAt ? { endsAt: move(plan.endsAt) } : {}),
    ...(plan.activatedAt ? { activatedAt: move(plan.activatedAt) } : {}),
    medicationInstructions: plan.medicationInstructions.map((instruction) => ({
      ...instruction,
      startsAt: move(instruction.startsAt),
      ...(instruction.endsAt ? { endsAt: move(instruction.endsAt) } : {}),
    })),
  };
}

let defaultRepository: DemoRepository | undefined;

export function getDemoRepository(): DemoRepository {
  if (!defaultRepository) {
    defaultRepository = new DemoRepository();
  }
  return defaultRepository;
}
