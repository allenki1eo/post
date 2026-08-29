/**
 * Canonical Zod schemas for the POST domain model.
 *
 * These schemas are the single source of truth: `models.ts` derives its
 * TypeScript types from them, seed JSON is validated against them at load
 * time, and repositories refuse data that does not parse.
 *
 * Timestamps are UTC ISO 8601 strings; identifiers are opaque UUIDs.
 */
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Shared enums
// ---------------------------------------------------------------------------

export const RoleSchema = z.enum(['patient', 'clinician', 'clinic_admin']);
export const WorkflowStatusSchema = z.enum(['on_track', 'review', 'urgent']);
export const SyncStatusSchema = z.enum(['local', 'syncing', 'synced', 'failed']);
export const SupportedLanguageSchema = z.enum(['en', 'sw']);
export const RecordSourceTypeSchema = z.enum([
  'clinician_verified',
  'facility_imported',
  'patient_reported',
  'ai_organized',
]);
export const VerificationStatusSchema = z.enum([
  'verified',
  'pending',
  'disputed',
  'superseded',
  'unverified',
]);
export const AgentRunStateSchema = z.enum([
  'created',
  'collecting_context',
  'calling_tools',
  'verifying',
  'awaiting_approval',
  'executing_approved_action',
  'completed',
  'abstained',
  'blocked',
  'failed',
]);
export const AgentTriggerSchema = z.enum([
  'check_in_submitted',
  'check_in_missed',
  'care_plan_changed',
  'clinician_requested_review',
  'passport_summary_requested',
]);
export const AgentOutcomeSchema = z.enum([
  'no_review_needed',
  'review_item_created',
  'urgent_review_item_created',
  'awaiting_clinician_approval',
  'approved_action_executed',
  'passport_summary_created',
  'abstained_missing_information',
  'blocked_by_safety_policy',
  'failed_recoverably',
]);
export const PassportCategorySchema = z.enum([
  'important_alerts',
  'medications',
  'allergies',
  'conditions',
  'encounters',
  'procedures',
  'care_plans',
  'clinician_advice',
  'observations',
  'documents',
]);

export const IsoTimestampSchema = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), 'must be an ISO 8601 timestamp');

export const LocalizedTextSchema = z.object({
  en: z.string().min(1),
  sw: z.string().min(1),
});

// ---------------------------------------------------------------------------
// People and places
// ---------------------------------------------------------------------------

export const UserSchema = z.object({
  id: z.string(),
  role: RoleSchema,
  displayName: z.string(),
  preferredLanguage: SupportedLanguageSchema,
  clinicId: z.string().optional(),
});

export const ClinicSchema = z.object({
  id: z.string(),
  name: z.string(),
  contactPhone: z.string().optional(),
  urgentContactInstructions: LocalizedTextSchema.optional(),
  synthetic: z.boolean(),
});

export const ClinicianSchema = z.object({
  id: z.string(),
  userId: z.string(),
  clinicId: z.string(),
  displayName: z.string(),
  roleTitle: z.string().optional(),
  synthetic: z.boolean(),
});

export const PatientSchema = z.object({
  id: z.string(),
  userId: z.string().optional(),
  homeClinicId: z.string().optional(),
  synthetic: z.boolean(),
  externalReference: z.string().optional(),
  preferredName: z.string(),
  timezone: z.string(),
  activeCarePlanId: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Care-plan configuration
// ---------------------------------------------------------------------------

export const JourneyTypeSchema = z.enum([
  'minor_procedure',
  'antibiotic_course',
  'hypertension_medication',
  'diabetes_medication',
]);

export const CheckInQuestionSchema = z.object({
  id: z.string(),
  key: z.string(),
  type: z.enum([
    'medication_confirmation',
    'overall_condition',
    'single_choice',
    'yes_no',
    'number',
    'text',
  ]),
  label: LocalizedTextSchema,
  helpText: LocalizedTextSchema.optional(),
  options: z.array(z.object({ value: z.string(), label: LocalizedTextSchema })).optional(),
  required: z.boolean(),
  minValue: z.number().optional(),
  maxValue: z.number().optional(),
});

export const ScheduleDefinitionSchema = z.object({
  frequency: z.enum(['daily']),
  timesOfDay: z.array(z.string().regex(/^\d{2}:\d{2}$/)),
  durationDays: z.number().int().positive().optional(),
});

export const RuleConditionSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('answer_equals'),
    questionId: z.string(),
    value: z.union([z.string(), z.number(), z.boolean()]),
  }),
  z.object({ kind: z.literal('answer_gte'), questionId: z.string(), value: z.number() }),
  z.object({ kind: z.literal('answer_lte'), questionId: z.string(), value: z.number() }),
  z.object({
    kind: z.literal('adherence_below'),
    threshold: z.number().min(0).max(1),
    minimumExpectedDoses: z.number().int().min(1),
  }),
  z.object({ kind: z.literal('missed_check_ins'), count: z.number().int().min(1) }),
  z.object({
    kind: z.literal('condition_worse_streak'),
    questionId: z.string(),
    count: z.number().int().min(1),
  }),
]);

export const WorkflowRuleSchema = z.object({
  id: z.string(),
  priority: z.enum(['urgent', 'review']),
  description: LocalizedTextSchema,
  condition: RuleConditionSchema,
  /** Clinic-approved message shown when the rule matches. Never model-generated. */
  messageOnMatch: LocalizedTextSchema,
  missingDataBehavior: z.enum(['ignore', 'flag_for_review']),
});

export const ClinicalReviewRecordSchema = z.object({
  version: z.number().int().positive(),
  status: z.enum(['pending_review', 'reviewed', 'changes_requested']),
  reviewerName: z.string().optional(),
  reviewedAt: IsoTimestampSchema.optional(),
  notes: z.string().optional(),
  demoLabel: z.literal('FOR DEMONSTRATION - CLINICAL REVIEW REQUIRED'),
});

export const CarePlanTemplateSchema = z.object({
  id: z.string(),
  version: z.number().int().positive(),
  name: LocalizedTextSchema,
  journeyType: JourneyTypeSchema,
  checkInQuestions: z.array(CheckInQuestionSchema).min(1),
  defaultSchedule: ScheduleDefinitionSchema,
  workflowRules: z.array(WorkflowRuleSchema),
  clinicalReview: ClinicalReviewRecordSchema,
});

export const MedicationInstructionSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  /** Exact clinician-entered wording; the app must never rephrase it. */
  clinicianWording: LocalizedTextSchema,
  scheduledTimes: z.array(z.string().regex(/^\d{2}:\d{2}$/)).min(1),
  startsAt: IsoTimestampSchema,
  endsAt: IsoTimestampSchema.optional(),
});

export const CarePlanSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  templateId: z.string(),
  templateVersion: z.number().int().positive(),
  status: z.enum(['draft', 'active', 'paused', 'completed', 'cancelled']),
  startsAt: IsoTimestampSchema,
  endsAt: IsoTimestampSchema.optional(),
  medicationInstructions: z.array(MedicationInstructionSchema),
  checkInSchedule: ScheduleDefinitionSchema,
  patientInstructions: LocalizedTextSchema,
  urgentInstructions: LocalizedTextSchema,
  activatedByClinicianId: z.string(),
  activatedAt: IsoTimestampSchema.optional(),
});

// ---------------------------------------------------------------------------
// Check-ins and evidence
// ---------------------------------------------------------------------------

export const AnswerSchema = z.object({
  questionId: z.string(),
  value: z.union([z.string(), z.number(), z.boolean()]),
});

export const CheckInResponseSchema = z
  .object({
    id: z.string(),
    scheduleId: z.string(),
    carePlanId: z.string(),
    patientId: z.string(),
    answers: z.array(AnswerSchema),
    expectedDoseIds: z.array(z.string()),
    confirmedDoseIds: z.array(z.string()),
    patientNote: z.string().optional(),
    completedAt: IsoTimestampSchema,
    deviceCreatedAt: IsoTimestampSchema,
    syncStatus: SyncStatusSchema,
  })
  .superRefine((checkIn, ctx) => {
    const expected = new Set(checkIn.expectedDoseIds);
    for (const doseId of checkIn.confirmedDoseIds) {
      if (!expected.has(doseId)) {
        ctx.addIssue({
          code: 'custom',
          message: `confirmedDoseIds must be a subset of expectedDoseIds (offending dose: ${doseId})`,
        });
      }
    }
  });

export const EvidenceReferenceSchema = z.object({
  type: z.enum([
    'check_in',
    'answer',
    'medication_confirmation',
    'adherence_calculation',
    'rule',
    'care_plan',
    'clinical_record',
    'schedule',
    'agent_step',
  ]),
  id: z.string(),
  description: z.string().optional(),
});

export const AlertSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  carePlanId: z.string(),
  status: WorkflowStatusSchema,
  reasonCode: z.string(),
  reasonText: LocalizedTextSchema,
  evidenceReferences: z.array(EvidenceReferenceSchema).min(1),
  source: z.enum(['deterministic_rule', 'model_suggestion']),
  reviewState: z.enum(['open', 'acknowledged', 'resolved']),
  createdAt: IsoTimestampSchema,
});

export const ClinicianDecisionSchema = z.object({
  id: z.string(),
  alertId: z.string(),
  clinicianId: z.string(),
  action: z.enum([
    'continue_monitoring',
    'contact_patient',
    'schedule_follow_up',
    'urgent_instructions_recorded',
    'duplicate',
    'resolved',
  ]),
  note: z.string().optional(),
  decidedAt: IsoTimestampSchema,
});

export const AuditEventSchema = z.object({
  id: z.string(),
  actorId: z.string(),
  actorRole: z.union([RoleSchema, z.literal('system')]),
  action: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  timestamp: IsoTimestampSchema,
  metadata: z.record(z.string(), z.unknown()),
});

// ---------------------------------------------------------------------------
// Clinical records (Care Passport)
// ---------------------------------------------------------------------------

const clinicalRecordBaseFields = {
  id: z.string(),
  patientId: z.string(),
  sourceType: RecordSourceTypeSchema,
  verificationStatus: VerificationStatusSchema,
  sourceOrganizationId: z.string().optional(),
  sourcePractitionerId: z.string().optional(),
  sourceRecordIdentifier: z.string().optional(),
  recordedAt: IsoTimestampSchema,
  effectiveStartsAt: IsoTimestampSchema.optional(),
  effectiveEndsAt: IsoTimestampSchema.optional(),
  supersedesRecordId: z.string().optional(),
  /** Set when a patient correction disputes this record, or vice versa. */
  disputesRecordId: z.string().optional(),
  fhirResourceType: z.string().optional(),
  fhirResourceId: z.string().optional(),
  synthetic: z.boolean(),
};

export const MedicationHistoryRecordSchema = z.object({
  ...clinicalRecordBaseFields,
  category: z.literal('medications'),
  medicationName: z.string(),
  clinicianInstructions: LocalizedTextSchema.optional(),
  status: z.enum(['active', 'completed', 'stopped', 'unknown']),
  statusRecordedBy: z.string().optional(),
});

export const AllergyRecordSchema = z.object({
  ...clinicalRecordBaseFields,
  category: z.literal('allergies'),
  substance: z.string(),
  reaction: LocalizedTextSchema.optional(),
  clinicalStatus: z.enum(['active', 'inactive', 'resolved', 'unknown']),
});

export const CareAdviceRecordSchema = z.object({
  ...clinicalRecordBaseFields,
  category: z.literal('clinician_advice'),
  advice: LocalizedTextSchema,
  status: z.enum(['active', 'completed', 'superseded']),
});

export const ConditionRecordSchema = z.object({
  ...clinicalRecordBaseFields,
  category: z.literal('conditions'),
  conditionName: LocalizedTextSchema,
  clinicalStatus: z.enum(['active', 'resolved', 'unknown']),
});

export const EncounterRecordSchema = z.object({
  ...clinicalRecordBaseFields,
  category: z.literal('encounters'),
  encounterType: LocalizedTextSchema,
  facilityName: z.string().optional(),
});

export const ProcedureRecordSchema = z.object({
  ...clinicalRecordBaseFields,
  category: z.literal('procedures'),
  procedureName: LocalizedTextSchema,
  outcomeNote: LocalizedTextSchema.optional(),
});

export const ObservationRecordSchema = z.object({
  ...clinicalRecordBaseFields,
  category: z.literal('observations'),
  observationName: LocalizedTextSchema,
  /** Value is optional: a missing value must render as "not available", never invented. */
  value: z.string().optional(),
  unit: z.string().optional(),
});

export const DocumentRecordSchema = z.object({
  ...clinicalRecordBaseFields,
  category: z.literal('documents'),
  title: LocalizedTextSchema,
  documentType: z.string().optional(),
});

export const ImportantAlertRecordSchema = z.object({
  ...clinicalRecordBaseFields,
  category: z.literal('important_alerts'),
  title: LocalizedTextSchema,
  detail: LocalizedTextSchema.optional(),
});

export const CarePlanSummaryRecordSchema = z.object({
  ...clinicalRecordBaseFields,
  category: z.literal('care_plans'),
  planName: LocalizedTextSchema,
  status: z.enum(['active', 'completed', 'cancelled']),
});

export const ClinicalRecordSchema = z.discriminatedUnion('category', [
  MedicationHistoryRecordSchema,
  AllergyRecordSchema,
  CareAdviceRecordSchema,
  ConditionRecordSchema,
  EncounterRecordSchema,
  ProcedureRecordSchema,
  ObservationRecordSchema,
  DocumentRecordSchema,
  ImportantAlertRecordSchema,
  CarePlanSummaryRecordSchema,
]);

export const RecordProvenanceSchema = z.object({
  id: z.string(),
  recordId: z.string(),
  actorId: z.string().optional(),
  organizationId: z.string().optional(),
  activity: z.enum(['created', 'imported', 'verified', 'corrected', 'superseded']),
  occurredAt: IsoTimestampSchema,
  signatureReference: z.string().optional(),
  sourceReference: z.string().optional(),
});

export const CarePassportSnapshotSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  generatedAt: IsoTimestampSchema,
  recordIds: z.array(z.string()),
  missingInformationWarnings: z.array(LocalizedTextSchema),
  conflictRecordGroups: z.array(z.array(z.string()).min(2)),
  continuitySummaryAgentRunId: z.string().optional(),
  sourceRevision: z.number().int().nonnegative(),
});

// ---------------------------------------------------------------------------
// Sharing
// ---------------------------------------------------------------------------

export const ShareGrantSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  /** Only the SHA-256 hash of the opaque token is ever stored. */
  tokenHash: z.string().regex(/^[0-9a-f]{64}$/),
  categories: z.array(PassportCategorySchema).min(1),
  purpose: z.string(),
  startsAt: IsoTimestampSchema,
  expiresAt: IsoTimestampSchema,
  maxUses: z.number().int().min(1),
  useCount: z.number().int().min(0),
  createdAt: IsoTimestampSchema,
  confirmedAt: IsoTimestampSchema,
  revokedAt: IsoTimestampSchema.optional(),
});

export const PassportAccessEventSchema = z.object({
  id: z.string(),
  shareGrantId: z.string(),
  recipientClinicianId: z.string().optional(),
  recipientOrganizationId: z.string().optional(),
  declaredPurpose: z.string().optional(),
  categoriesViewed: z.array(PassportCategorySchema),
  outcome: z.enum(['allowed', 'expired', 'revoked', 'over_use_limit', 'denied']),
  occurredAt: IsoTimestampSchema,
});

export const ConsentRecordSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  scope: z.enum(['follow_up_monitoring', 'care_passport_storage', 'share_grant']),
  language: SupportedLanguageSchema,
  grantedAt: IsoTimestampSchema,
  withdrawnAt: IsoTimestampSchema.optional(),
  contentVersion: z.string(),
});

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export const NotificationSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  kind: z.enum(['medication_reminder', 'check_in_due']),
  scheduledFor: IsoTimestampSchema,
  language: SupportedLanguageSchema,
  /** Clinician-entered wording for medication reminders; localization key otherwise. */
  clinicianWording: LocalizedTextSchema.optional(),
  messageKey: z.string().optional(),
  deliveryIntentRecordedAt: IsoTimestampSchema.optional(),
});

// ---------------------------------------------------------------------------
// Agent
// ---------------------------------------------------------------------------

export const AgentPermissionSchema = z.enum(['automatic', 'approval_required', 'prohibited']);

export const AgentToolCallSchema = z.object({
  toolName: z.string(),
  /** Arguments with health data redacted before persisting to the trace. */
  argumentsRedacted: z.record(z.string(), z.unknown()),
  resultSummary: z.string().optional(),
  permission: AgentPermissionSchema,
  allowed: z.boolean(),
  idempotencyKey: z.string().optional(),
});

export const AgentStepSchema = z.object({
  index: z.number().int().nonnegative(),
  kind: z.enum(['state_transition', 'tool_call', 'safety_check', 'note']),
  state: AgentRunStateSchema.optional(),
  toolCall: AgentToolCallSchema.optional(),
  note: z.string().optional(),
  occurredAt: IsoTimestampSchema,
});

export const AgentActionTypeSchema = z.enum([
  'create_review_item',
  'draft_patient_message',
  'schedule_reminder',
  'request_follow_up',
  'record_internal_note',
]);

export const AgentActionDraftSchema = z.object({
  id: z.string(),
  agentRunId: z.string(),
  type: AgentActionTypeSchema,
  version: z.number().int().positive(),
  payload: z.record(z.string(), z.unknown()),
  evidenceReferences: z.array(EvidenceReferenceSchema),
  approvalRequired: z.boolean(),
  status: z.enum(['draft', 'awaiting_approval', 'approved', 'rejected', 'executed']),
});

export const AgentApprovalSchema = z.object({
  id: z.string(),
  actionDraftId: z.string(),
  /** Approval binds to one exact draft version; edits invalidate it. */
  actionDraftVersion: z.number().int().positive(),
  reviewerClinicianId: z.string(),
  decision: z.enum(['approved', 'edited_and_approved', 'rejected']),
  editedPayload: z.record(z.string(), z.unknown()).optional(),
  note: z.string().optional(),
  decidedAt: IsoTimestampSchema,
});

export const AgentRunSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  carePlanId: z.string().optional(),
  trigger: AgentTriggerSchema,
  state: AgentRunStateSchema,
  outcome: AgentOutcomeSchema.optional(),
  outputLanguage: SupportedLanguageSchema,
  inputReferences: z.array(EvidenceReferenceSchema),
  steps: z.array(AgentStepSchema),
  proposedActions: z.array(AgentActionDraftSchema),
  proposedStatus: WorkflowStatusSchema.optional(),
  summary: z.string().optional(),
  abstained: z.boolean(),
  abstentionReason: z.string().optional(),
  modelProvider: z.string().optional(),
  modelName: z.string().optional(),
  promptVersion: z.string().optional(),
  createdAt: IsoTimestampSchema,
  completedAt: IsoTimestampSchema.optional(),
});

export const SafeAgentOutputSchema = z.object({
  summary: z.string(),
  facts: z.array(
    z.object({
      text: z.string(),
      evidenceReferenceIds: z.array(z.string()).min(1),
    }),
  ),
  proposedStatus: WorkflowStatusSchema.optional(),
  proposedActions: z.array(
    z.object({
      type: AgentActionTypeSchema,
      reason: z.string(),
      evidenceReferenceIds: z.array(z.string()),
      requiresApproval: z.boolean(),
    }),
  ),
  conflicts: z.array(
    z.object({
      recordIds: z.array(z.string()).min(2),
      explanation: z.string(),
    }),
  ),
  missingInformation: z.array(z.string()),
  uncertainty: z.array(z.string()),
  abstain: z.boolean(),
  abstentionReason: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Synthetic fixture wrappers (seed data)
// ---------------------------------------------------------------------------

export const SyntheticFollowUpCaseSchema = z.object({
  id: z.string(),
  synthetic: z.literal(true),
  journeyType: JourneyTypeSchema,
  templateId: z.string(),
  templateVersion: z.number().int().positive(),
  patientId: z.string(),
  carePlan: CarePlanSchema,
  checkIns: z.array(CheckInResponseSchema),
  missedCheckInScheduleIds: z.array(z.string()),
  expectedLabel: WorkflowStatusSchema,
  expectedMatchedRuleIds: z.array(z.string()),
  expectedEvidenceReferences: z.array(EvidenceReferenceSchema),
  expectedReason: z.string(),
});

export const SyntheticPassportSchema = z.object({
  id: z.string(),
  synthetic: z.literal(true),
  journeyType: JourneyTypeSchema,
  patient: PatientSchema,
  records: z.array(ClinicalRecordSchema),
  provenance: z.array(RecordProvenanceSchema),
  snapshot: CarePassportSnapshotSchema,
  shareGrants: z.array(ShareGrantSchema),
  accessEvents: z.array(PassportAccessEventSchema),
});

export const SyntheticAgentRunSchema = z.object({
  id: z.string(),
  synthetic: z.literal(true),
  description: z.string(),
  run: AgentRunSchema,
  approvals: z.array(AgentApprovalSchema),
  expectedOutcome: AgentOutcomeSchema,
  expectedOrderedToolNames: z.array(z.string()),
  expectedPermissionDecisions: z.array(
    z.object({
      toolName: z.string(),
      permission: AgentPermissionSchema,
      allowed: z.boolean(),
    }),
  ),
  modelDisabledPathEquivalent: z.boolean(),
});
