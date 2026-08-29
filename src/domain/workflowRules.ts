/**
 * Deterministic, explainable workflow classification.
 *
 * Rules come from versioned, clinician-reviewed care-plan templates. The
 * output is a workflow priority (`on_track` | `review` | `urgent`) — never a
 * diagnosis — with the exact matched rules and evidence references that caused
 * it. Precedence is urgent > review > on_track, and a model suggestion can
 * never downgrade a deterministic urgent result (enforced in safety.ts).
 */
import { calculateAdherence } from './adherence';
import type { CheckInResponse, EvidenceReference, WorkflowRule, WorkflowStatus } from './models';

export interface RuleMatch {
  ruleId: string;
  priority: 'urgent' | 'review';
  evidenceReferences: EvidenceReference[];
}

export interface WorkflowEvaluation {
  status: WorkflowStatus;
  matchedRules: RuleMatch[];
  missingDataReviewRuleIds: string[];
}

export interface WorkflowEvaluationInput {
  rules: readonly WorkflowRule[];
  /** Newest first is not required; evaluation orders check-ins itself. */
  checkIns: readonly CheckInResponse[];
  /** The check-in that triggered evaluation; rules on answers read from it. */
  triggeringCheckIn?: CheckInResponse;
  missedCheckInCount?: number;
  missedCheckInScheduleIds?: readonly string[];
}

export function evaluateWorkflowRules(input: WorkflowEvaluationInput): WorkflowEvaluation {
  const matchedRules: RuleMatch[] = [];
  const missingDataReviewRuleIds: string[] = [];

  for (const rule of input.rules) {
    const result = evaluateCondition(rule, input);
    if (result.matched) {
      matchedRules.push({
        ruleId: rule.id,
        priority: rule.priority,
        evidenceReferences: result.evidence,
      });
    } else if (result.missingData && rule.missingDataBehavior === 'flag_for_review') {
      missingDataReviewRuleIds.push(rule.id);
    }
  }

  let status: WorkflowStatus = 'on_track';
  if (matchedRules.some((m) => m.priority === 'urgent')) {
    status = 'urgent';
  } else if (matchedRules.length > 0 || missingDataReviewRuleIds.length > 0) {
    status = 'review';
  }

  return { status, matchedRules, missingDataReviewRuleIds };
}

interface ConditionResult {
  matched: boolean;
  missingData: boolean;
  evidence: EvidenceReference[];
}

function evaluateCondition(rule: WorkflowRule, input: WorkflowEvaluationInput): ConditionResult {
  const condition = rule.condition;
  const ruleEvidence: EvidenceReference = { type: 'rule', id: rule.id };

  switch (condition.kind) {
    case 'answer_equals':
    case 'answer_gte':
    case 'answer_lte': {
      const checkIn = input.triggeringCheckIn;
      if (!checkIn) {
        return { matched: false, missingData: true, evidence: [] };
      }
      const answer = checkIn.answers.find((a) => a.questionId === condition.questionId);
      if (answer === undefined) {
        return { matched: false, missingData: true, evidence: [] };
      }
      let matched = false;
      if (condition.kind === 'answer_equals') {
        matched = answer.value === condition.value;
      } else if (typeof answer.value === 'number') {
        matched =
          condition.kind === 'answer_gte'
            ? answer.value >= condition.value
            : answer.value <= condition.value;
      }
      return {
        matched,
        missingData: false,
        evidence: matched
          ? [
              ruleEvidence,
              { type: 'check_in', id: checkIn.id },
              { type: 'answer', id: `${checkIn.id}:${condition.questionId}` },
            ]
          : [],
      };
    }

    case 'adherence_below': {
      const adherence = calculateAdherence(input.checkIns);
      if (
        adherence.kind === 'not_applicable' ||
        adherence.expected < condition.minimumExpectedDoses
      ) {
        return { matched: false, missingData: adherence.kind === 'not_applicable', evidence: [] };
      }
      const matched = adherence.fraction < condition.threshold;
      return {
        matched,
        missingData: false,
        evidence: matched
          ? [
              ruleEvidence,
              {
                type: 'adherence_calculation',
                id: `adherence:${adherence.confirmed}/${adherence.expected}`,
              },
              ...adherence.evidenceReferences,
            ]
          : [],
      };
    }

    case 'missed_check_ins': {
      const missed = input.missedCheckInCount ?? input.missedCheckInScheduleIds?.length ?? 0;
      const matched = missed >= condition.count;
      return {
        matched,
        missingData: false,
        evidence: matched
          ? [
              ruleEvidence,
              ...(input.missedCheckInScheduleIds ?? []).map((scheduleId): EvidenceReference => ({
                type: 'schedule',
                id: scheduleId,
              })),
            ]
          : [],
      };
    }

    case 'condition_worse_streak': {
      const ordered = [...input.checkIns].sort((a, b) =>
        a.completedAt.localeCompare(b.completedAt),
      );
      const recent = ordered.slice(-condition.count);
      if (recent.length < condition.count) {
        return { matched: false, missingData: true, evidence: [] };
      }
      const allWorse = recent.every((checkIn) =>
        checkIn.answers.some((a) => a.questionId === condition.questionId && a.value === 'worse'),
      );
      return {
        matched: allWorse,
        missingData: false,
        evidence: allWorse
          ? [
              ruleEvidence,
              ...recent.map((c): EvidenceReference => ({ type: 'check_in', id: c.id })),
            ]
          : [],
      };
    }
  }
}
