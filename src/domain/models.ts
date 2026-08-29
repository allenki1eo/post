/**
 * TypeScript domain models, derived from the canonical Zod schemas so the
 * runtime validation and the static types can never drift apart.
 */
import { z } from 'zod';

import * as schemas from './schemas';

export type Role = z.infer<typeof schemas.RoleSchema>;
export type WorkflowStatus = z.infer<typeof schemas.WorkflowStatusSchema>;
export type SyncStatus = z.infer<typeof schemas.SyncStatusSchema>;
export type SupportedLanguage = z.infer<typeof schemas.SupportedLanguageSchema>;
export type RecordSourceType = z.infer<typeof schemas.RecordSourceTypeSchema>;
export type VerificationStatus = z.infer<typeof schemas.VerificationStatusSchema>;
export type AgentRunState = z.infer<typeof schemas.AgentRunStateSchema>;
export type AgentTrigger = z.infer<typeof schemas.AgentTriggerSchema>;
export type AgentOutcome = z.infer<typeof schemas.AgentOutcomeSchema>;
export type PassportCategory = z.infer<typeof schemas.PassportCategorySchema>;
export type LocalizedText = z.infer<typeof schemas.LocalizedTextSchema>;

export type User = z.infer<typeof schemas.UserSchema>;
export type Clinic = z.infer<typeof schemas.ClinicSchema>;
export type Clinician = z.infer<typeof schemas.ClinicianSchema>;
export type Patient = z.infer<typeof schemas.PatientSchema>;

export type JourneyType = z.infer<typeof schemas.JourneyTypeSchema>;
export type CheckInQuestion = z.infer<typeof schemas.CheckInQuestionSchema>;
export type ScheduleDefinition = z.infer<typeof schemas.ScheduleDefinitionSchema>;
export type RuleCondition = z.infer<typeof schemas.RuleConditionSchema>;
export type WorkflowRule = z.infer<typeof schemas.WorkflowRuleSchema>;
export type ClinicalReviewRecord = z.infer<typeof schemas.ClinicalReviewRecordSchema>;
export type CarePlanTemplate = z.infer<typeof schemas.CarePlanTemplateSchema>;
export type MedicationInstruction = z.infer<typeof schemas.MedicationInstructionSchema>;
export type CarePlan = z.infer<typeof schemas.CarePlanSchema>;

export type Answer = z.infer<typeof schemas.AnswerSchema>;
export type CheckInResponse = z.infer<typeof schemas.CheckInResponseSchema>;
export type EvidenceReference = z.infer<typeof schemas.EvidenceReferenceSchema>;
export type Alert = z.infer<typeof schemas.AlertSchema>;
export type ClinicianDecision = z.infer<typeof schemas.ClinicianDecisionSchema>;
export type AuditEvent = z.infer<typeof schemas.AuditEventSchema>;

export type MedicationHistoryRecord = z.infer<typeof schemas.MedicationHistoryRecordSchema>;
export type AllergyRecord = z.infer<typeof schemas.AllergyRecordSchema>;
export type CareAdviceRecord = z.infer<typeof schemas.CareAdviceRecordSchema>;
export type ConditionRecord = z.infer<typeof schemas.ConditionRecordSchema>;
export type EncounterRecord = z.infer<typeof schemas.EncounterRecordSchema>;
export type ProcedureRecord = z.infer<typeof schemas.ProcedureRecordSchema>;
export type ObservationRecord = z.infer<typeof schemas.ObservationRecordSchema>;
export type DocumentRecord = z.infer<typeof schemas.DocumentRecordSchema>;
export type ImportantAlertRecord = z.infer<typeof schemas.ImportantAlertRecordSchema>;
export type CarePlanSummaryRecord = z.infer<typeof schemas.CarePlanSummaryRecordSchema>;
export type ClinicalRecord = z.infer<typeof schemas.ClinicalRecordSchema>;
export type RecordProvenance = z.infer<typeof schemas.RecordProvenanceSchema>;
export type CarePassportSnapshot = z.infer<typeof schemas.CarePassportSnapshotSchema>;

export type ShareGrant = z.infer<typeof schemas.ShareGrantSchema>;
export type PassportAccessEvent = z.infer<typeof schemas.PassportAccessEventSchema>;
export type ConsentRecord = z.infer<typeof schemas.ConsentRecordSchema>;
export type Notification = z.infer<typeof schemas.NotificationSchema>;

export type AgentPermission = z.infer<typeof schemas.AgentPermissionSchema>;
export type AgentToolCall = z.infer<typeof schemas.AgentToolCallSchema>;
export type AgentStep = z.infer<typeof schemas.AgentStepSchema>;
export type AgentActionType = z.infer<typeof schemas.AgentActionTypeSchema>;
export type AgentActionDraft = z.infer<typeof schemas.AgentActionDraftSchema>;
export type AgentApproval = z.infer<typeof schemas.AgentApprovalSchema>;
export type AgentRun = z.infer<typeof schemas.AgentRunSchema>;
export type SafeAgentOutput = z.infer<typeof schemas.SafeAgentOutputSchema>;

export type SyntheticFollowUpCase = z.infer<typeof schemas.SyntheticFollowUpCaseSchema>;
export type SyntheticPassport = z.infer<typeof schemas.SyntheticPassportSchema>;
export type SyntheticAgentRun = z.infer<typeof schemas.SyntheticAgentRunSchema>;
