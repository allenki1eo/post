/**
 * POST Care Agent permission policy (specification §12).
 *
 * Deterministic, allowlist-based. A tool that is not registered is
 * `prohibited` — there is no default-allow path. Patient/clinic scoping is
 * enforced here as well: every run is scoped to exactly one patient, and a
 * tool call referencing another patient is refused regardless of the tool's
 * own permission level.
 */
import type { AgentPermission } from '../domain/models';
import { getToolDefinition } from './toolRegistry';

export interface PermissionDecision {
  toolName: string;
  permission: AgentPermission;
  allowed: boolean;
  reason: string;
}

export interface PermissionContext {
  /** The single patient this run is scoped to. */
  runPatientId: string;
  /** Patient id referenced by the tool call arguments, when present. */
  argumentPatientId?: string;
  /** Present when a valid approval accompanies an approval-required call. */
  approvalId?: string;
}

export function checkToolPermission(
  toolName: string,
  context: PermissionContext,
): PermissionDecision {
  const definition = getToolDefinition(toolName);
  if (!definition) {
    return {
      toolName,
      permission: 'prohibited',
      allowed: false,
      reason: 'Tool is not in the allowlisted registry',
    };
  }

  if (
    context.argumentPatientId !== undefined &&
    context.argumentPatientId !== context.runPatientId
  ) {
    return {
      toolName,
      permission: definition.permission,
      allowed: false,
      reason: `Tool call references patient ${context.argumentPatientId} outside the run scope`,
    };
  }

  if (definition.permission === 'approval_required' && !context.approvalId) {
    return {
      toolName,
      permission: 'approval_required',
      allowed: false,
      reason: 'Execution tool requires a valid clinician approval',
    };
  }

  return {
    toolName,
    permission: definition.permission,
    allowed: true,
    reason: 'Allowed by policy',
  };
}

/**
 * Actions that are permanently prohibited whatever tool tries to express
 * them. Listed explicitly so tests and docs can assert the policy.
 */
export const PERMANENTLY_PROHIBITED_ACTIONS = [
  'diagnose',
  'prescribe',
  'change_dose',
  'stop_medication',
  'declare_treatment_outcome',
  'promote_record_authority',
  'widen_share_grant',
  'approve_own_action',
  'access_other_patient',
  'search_public_web',
] as const;
