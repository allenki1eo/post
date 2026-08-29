/**
 * Check-in submission.
 *
 * Submitting is local-first and never depends on connectivity or on a model:
 *
 * 1. validate the draft against the assigned template version;
 * 2. save the check-in and enqueue its immutable outbox operation in ONE
 *    transaction, then confirm to the patient immediately;
 * 3. evaluate the clinic's approved rules locally, so an urgent match shows the
 *    clinic-authored instruction right away, online or offline.
 *
 * The server derives the Care Agent trigger from the accepted check-in, so the
 * device never queues a second, separately-losable trigger operation and never
 * runs a model or tool loop itself.
 */
import type {
  Answer,
  CarePlan,
  CarePlanTemplate,
  CheckInResponse,
  LocalizedText,
  WorkflowStatus,
} from '../../domain/models';
import { CheckInResponseSchema } from '../../domain/schemas';
import { evaluateWorkflowRules, type RuleMatch } from '../../domain/workflowRules';
import { buildOperation, checkInIdempotencyKey } from '../../storage/outbox';
import type { LocalStore, StoredCheckIn } from '../../storage/types';
import { newId } from '../../utils/ids';
import { missedScheduleIds, todaysSchedule } from './schedule';

export interface CheckInDraft {
  answers: Answer[];
  confirmedDoseIds: string[];
  patientNote?: string;
}

export interface SubmitCheckInInput {
  store: LocalStore;
  patientId: string;
  timezone: string;
  carePlan: CarePlan;
  template: CarePlanTemplate;
  draft: CheckInDraft;
  nowIso?: string;
  idFactory?: () => string;
}

export interface UrgentInstruction {
  ruleId: string;
  /** Clinic-authored wording. Never generated, never paraphrased. */
  message: LocalizedText;
}

export interface SubmitCheckInResult {
  checkIn: StoredCheckIn;
  /** True when this submission replaced an earlier local revision. */
  replacedLocalRevision: boolean;
  status: WorkflowStatus;
  matchedRules: RuleMatch[];
  urgentInstructions: UrgentInstruction[];
  /** The plan's clinic-authored urgent instructions, shown alongside a match. */
  planUrgentInstructions: LocalizedText;
}

export async function submitCheckIn(input: SubmitCheckInInput): Promise<SubmitCheckInResult> {
  const nowIso = input.nowIso ?? new Date().toISOString();
  const makeId = input.idFactory ?? newId;
  const schedule = todaysSchedule(input.carePlan, input.timezone, nowIso);

  // An unconfirmed dose is never inferred, and a confirmation outside today's
  // expected set is dropped rather than silently recorded.
  const expected = new Set(schedule.expectedDoseIds);
  const confirmedDoseIds = [...new Set(input.draft.confirmedDoseIds)].filter((id) =>
    expected.has(id),
  );

  const existing = (await input.store.listCheckIns(input.patientId)).find(
    (checkIn) => checkIn.scheduleId === schedule.scheduleId,
  );

  const candidate: CheckInResponse = {
    id: existing?.id ?? makeId(),
    scheduleId: schedule.scheduleId,
    carePlanId: input.carePlan.id,
    patientId: input.patientId,
    answers: input.draft.answers,
    expectedDoseIds: schedule.expectedDoseIds,
    confirmedDoseIds,
    ...(input.draft.patientNote ? { patientNote: input.draft.patientNote } : {}),
    completedAt: nowIso,
    deviceCreatedAt: existing?.deviceCreatedAt ?? nowIso,
    syncStatus: 'local',
  };

  // Fails loudly rather than persisting a check-in that breaks a domain
  // invariant (for example a confirmed dose outside the expected set).
  const validated = CheckInResponseSchema.parse(candidate);

  // A resubmission with identical content keeps its revision, so its
  // idempotency key is unchanged and no duplicate operation is enqueued.
  const contentChanged = existing !== undefined && !sameContent(existing, validated);
  const revision = existing === undefined ? 1 : existing.revision + (contentChanged ? 1 : 0);

  const stored: StoredCheckIn = { ...validated, revision };
  const operation = buildOperation({
    type: 'submit_check_in',
    idempotencyKey: checkInIdempotencyKey(stored.id, revision),
    payload: { checkIn: stored },
    checkInId: stored.id,
    nowIso,
    idFactory: makeId,
  });

  await input.store.saveCheckInWithOperation(stored, operation);

  const allCheckIns = await input.store.listCheckIns(input.patientId);
  const evaluation = evaluateWorkflowRules({
    rules: input.template.workflowRules,
    checkIns: allCheckIns,
    triggeringCheckIn: stored,
    missedCheckInScheduleIds: missedScheduleIds(
      input.carePlan,
      input.timezone,
      nowIso,
      allCheckIns.map((checkIn) => checkIn.scheduleId),
    ),
  });

  const urgentInstructions: UrgentInstruction[] = evaluation.matchedRules
    .filter((match) => match.priority === 'urgent')
    .map((match) => ({
      ruleId: match.ruleId,
      message: input.template.workflowRules.find((rule) => rule.id === match.ruleId)!
        .messageOnMatch,
    }));

  return {
    checkIn: stored,
    replacedLocalRevision: contentChanged,
    status: evaluation.status,
    matchedRules: evaluation.matchedRules,
    urgentInstructions,
    planUrgentInstructions: input.carePlan.urgentInstructions,
  };
}

function sameContent(a: StoredCheckIn, b: CheckInResponse): boolean {
  return (
    JSON.stringify(a.answers) === JSON.stringify(b.answers) &&
    JSON.stringify([...a.confirmedDoseIds].sort()) ===
      JSON.stringify([...b.confirmedDoseIds].sort()) &&
    (a.patientNote ?? '') === (b.patientNote ?? '')
  );
}

/** Has the patient already completed today's scheduled check-in? */
export async function findCheckInForSchedule(
  store: LocalStore,
  patientId: string,
  scheduleId: string,
): Promise<StoredCheckIn | undefined> {
  return (await store.listCheckIns(patientId)).find((checkIn) => checkIn.scheduleId === scheduleId);
}
