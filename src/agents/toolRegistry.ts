/**
 * Allowlisted tool registry for the POST Care Agent.
 *
 * Every tool declares a Zod input schema, permission level, idempotency
 * behavior, and timeout. Anything absent from this registry is prohibited.
 * The registry deliberately contains no public-web tool, no unrestricted SQL,
 * no arbitrary code execution, and no generic messaging tool.
 */
import { z } from 'zod';

import type { AgentPermission } from '../domain/models';

export interface ToolDefinition {
  name: string;
  description: string;
  permission: AgentPermission;
  /** Mutating tools must be idempotent and safe to retry. */
  mutating: boolean;
  idempotent: boolean;
  timeoutMs: number;
  inputSchema: z.ZodTypeAny;
}

const t = (
  name: string,
  description: string,
  permission: AgentPermission,
  inputSchema: z.ZodTypeAny,
  { mutating = false, idempotent = true, timeoutMs = 5_000 } = {},
): ToolDefinition => ({
  name,
  description,
  permission,
  mutating,
  idempotent,
  timeoutMs,
  inputSchema,
});

const patientScoped = z.object({ patientId: z.string() });

export const TOOL_REGISTRY: readonly ToolDefinition[] = [
  // Read and calculate (automatic)
  t(
    'getActiveCarePlan',
    'Load the active care plan for the scoped patient',
    'automatic',
    patientScoped,
  ),
  t(
    'getRecentCheckIns',
    'Load recent check-ins in a bounded window',
    'automatic',
    patientScoped.extend({ windowDays: z.number().int().min(1).max(31).optional() }),
  ),
  t(
    'getPassportRecords',
    'Load passport records for allowed categories only',
    'automatic',
    patientScoped.extend({ allowedCategories: z.array(z.string()) }),
  ),
  t(
    'getRecordProvenance',
    'Load provenance for referenced records',
    'automatic',
    z.object({ recordIds: z.array(z.string()).optional(), recordCount: z.number().optional() }),
  ),
  t(
    'calculateMedicationAdherence',
    'Deterministic adherence calculation (never model-computed)',
    'automatic',
    z.object({
      carePlanId: z.string(),
      dateRange: z.object({ from: z.string(), to: z.string() }).optional(),
    }),
  ),
  t(
    'evaluateClinicianRules',
    'Evaluate clinician-approved workflow rules',
    'automatic',
    z.object({ checkInId: z.string() }),
  ),
  t(
    'findRecordConflicts',
    'Group conflicting records for human reconciliation',
    'automatic',
    z.object({ recordIds: z.array(z.string()).optional() }),
  ),
  t(
    'buildEvidenceBundle',
    'Assemble the evidence bundle for this run',
    'automatic',
    z.object({
      referenceIds: z.array(z.string()).optional(),
      referenceCount: z.number().optional(),
    }),
  ),
  t(
    'validateEvidenceBundle',
    'Verify every claim resolves to an allowed source',
    'automatic',
    z.object({ bundleId: z.string().optional() }),
  ),
  t(
    'renderApprovedTemplate',
    'Render a reviewed bilingual message template',
    'automatic',
    z.object({
      templateId: z.string(),
      language: z.enum(['en', 'sw']),
      variables: z.record(z.string(), z.string()).optional(),
    }),
  ),

  // Internal drafts (automatic; nothing leaves the system)
  t(
    'createInternalReviewItem',
    'Create an internal, evidence-linked review item',
    'automatic',
    z.object({ status: z.enum(['review', 'urgent']), evidenceBundleId: z.string().optional() }),
    { mutating: true },
  ),
  t(
    'createAgentActionDraft',
    'Create an action draft (approval-gated when consequential)',
    'automatic',
    z.object({ type: z.string(), payload: z.record(z.string(), z.unknown()).optional() }),
    { mutating: true },
  ),
  t(
    'createAiOrganizedPassportSummary',
    'Create an ai_organized summary citing source records',
    'automatic',
    z.object({ recordIds: z.array(z.string()).optional(), recordCount: z.number().optional() }),
    { mutating: true },
  ),
  t('writeAgentTrace', 'Append a step to the immutable run trace', 'automatic', z.object({}), {
    mutating: true,
  }),
  t(
    'writeAuditEvent',
    'Append an audit event (append-only)',
    'automatic',
    z.object({ action: z.string().optional() }),
    { mutating: true },
  ),

  // Execution (clinician approval required; validated against the exact
  // action-draft version before anything runs)
  t(
    'sendApprovedPatientMessage',
    'Send a clinician-approved patient message exactly once',
    'approval_required',
    z.object({ actionDraftId: z.string(), approvalId: z.string().optional() }),
    { mutating: true },
  ),
  t(
    'scheduleApprovedFollowUp',
    'Schedule a clinician-approved follow-up',
    'approval_required',
    z.object({ actionDraftId: z.string(), approvalId: z.string().optional() }),
    { mutating: true },
  ),
  t(
    'recordClinicianConfirmedContact',
    'Record contact the clinician confirmed happened',
    'approval_required',
    z.object({ actionDraftId: z.string(), approvalId: z.string().optional() }),
    { mutating: true },
  ),
  t(
    'resolveAlert',
    'Resolve an alert with a clinician approval',
    'approval_required',
    z.object({ actionDraftId: z.string(), approvalId: z.string().optional() }),
    { mutating: true },
  ),
];

const byName = new Map(TOOL_REGISTRY.map((tool) => [tool.name, tool]));

export function getToolDefinition(name: string): ToolDefinition | undefined {
  return byName.get(name);
}

export function isRegisteredTool(name: string): boolean {
  return byName.has(name);
}
