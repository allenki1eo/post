/**
 * Approval binding and verification (the "approval verifier" trusted
 * component).
 *
 * An approval binds to one exact action-draft version. If the draft payload,
 * evidence, care plan, or grant changes, the version increments and the old
 * approval is invalid. An agent can never approve its own action: reviewer
 * identity must belong to an authorized clinician.
 */
import type { AgentActionDraft, AgentApproval } from '../domain/models';

export type ApprovalValidationFailure =
  | 'approval_missing'
  | 'draft_mismatch'
  | 'version_mismatch'
  | 'decision_not_approving'
  | 'reviewer_not_authorized'
  | 'reviewer_is_agent';

export interface ApprovalValidationResult {
  valid: boolean;
  failure?: ApprovalValidationFailure;
}

export function validateApprovalForExecution(
  draft: AgentActionDraft,
  approval: AgentApproval | undefined,
  authorizedClinicianIds: ReadonlySet<string>,
): ApprovalValidationResult {
  if (!approval) {
    return { valid: false, failure: 'approval_missing' };
  }
  if (approval.actionDraftId !== draft.id) {
    return { valid: false, failure: 'draft_mismatch' };
  }
  if (approval.actionDraftVersion !== draft.version) {
    return { valid: false, failure: 'version_mismatch' };
  }
  if (approval.decision === 'rejected') {
    return { valid: false, failure: 'decision_not_approving' };
  }
  if (approval.reviewerClinicianId.startsWith('agent-')) {
    return { valid: false, failure: 'reviewer_is_agent' };
  }
  if (!authorizedClinicianIds.has(approval.reviewerClinicianId)) {
    return { valid: false, failure: 'reviewer_not_authorized' };
  }
  return { valid: true };
}

/**
 * Editing a draft produces a new version; any approval for the previous
 * version no longer validates.
 */
export function editDraftPayload(
  draft: AgentActionDraft,
  newPayload: Record<string, unknown>,
): AgentActionDraft {
  return {
    ...draft,
    payload: newPayload,
    version: draft.version + 1,
    status: 'awaiting_approval',
  };
}
