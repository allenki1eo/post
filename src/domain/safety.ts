/**
 * Deterministic safety verifier for agent output.
 *
 * Runs before an approval request and again before approved execution. It is
 * ordinary code, not a model, so it works with the model disabled.
 *
 * Checks:
 * - every fact resolves to allowed evidence references;
 * - forbidden clinical claims (diagnosis, medication advice, treatment
 *   verdicts) are rejected;
 * - a model suggestion can never downgrade a deterministic urgent result;
 * - missing evidence forces abstention instead of invention.
 *
 * The phrase lists are demonstration heuristics and are themselves listed for
 * qualified clinical review (docs/CLINICAL_REVIEW.md). They are a backstop:
 * the primary defenses are the schema-constrained output contract and the
 * allowlisted tool registry.
 */
import type { SafeAgentOutput, WorkflowStatus } from './models';

export interface SafetyViolation {
  code:
    | 'fact_without_evidence'
    | 'unresolvable_evidence_reference'
    | 'forbidden_clinical_claim'
    | 'urgent_downgrade'
    | 'missing_abstention'
    | 'action_without_evidence';
  message: string;
}

export interface SafetyVerdict {
  ok: boolean;
  violations: SafetyViolation[];
}

/** DEMO HEURISTICS — pending qualified clinical review. */
const FORBIDDEN_CLAIM_PATTERNS: { pattern: RegExp; label: string }[] = [
  {
    pattern:
      /\b(you|patient)\s+(has|have|had)\s+(an?\s+)?(infection|sepsis|pneumonia|malaria|diabetes complication|hypertensive crisis)\b/i,
    label: 'diagnosis claim',
  },
  { pattern: /\bdiagnos(is|ed|e)\b/i, label: 'diagnosis language' },
  {
    pattern:
      /\b(stop|start|skip|double|increase|decrease|reduce)\s+(taking\s+)?(the\s+|your\s+)?(dose|medication|medicine|tablets?|dawa)\b/i,
    label: 'medication advice',
  },
  {
    pattern: /\btreatment\s+(has\s+)?(succeeded|failed|worked|not worked)\b/i,
    label: 'treatment verdict',
  },
  { pattern: /\bprescrib/i, label: 'prescribing language' },
];

export function findForbiddenClaims(text: string): string[] {
  return FORBIDDEN_CLAIM_PATTERNS.filter(({ pattern }) => pattern.test(text)).map(
    ({ label }) => label,
  );
}

export interface SafetyContext {
  /** Evidence reference ids the run actually loaded (buildEvidenceBundle). */
  allowedEvidenceReferenceIds: ReadonlySet<string>;
  /** The deterministic rule engine's result for the same inputs, if any. */
  deterministicStatus?: WorkflowStatus;
  /** True when required inputs were missing and abstention is mandatory. */
  requiredInputMissing?: boolean;
}

export function verifySafeAgentOutput(
  output: SafeAgentOutput,
  context: SafetyContext,
): SafetyVerdict {
  const violations: SafetyViolation[] = [];

  for (const fact of output.facts) {
    if (fact.evidenceReferenceIds.length === 0) {
      violations.push({
        code: 'fact_without_evidence',
        message: `Fact has no evidence reference: "${fact.text}"`,
      });
    }
    for (const refId of fact.evidenceReferenceIds) {
      if (!context.allowedEvidenceReferenceIds.has(refId)) {
        violations.push({
          code: 'unresolvable_evidence_reference',
          message: `Fact cites evidence outside the run's bundle: ${refId}`,
        });
      }
    }
    for (const label of findForbiddenClaims(fact.text)) {
      violations.push({
        code: 'forbidden_clinical_claim',
        message: `Fact contains ${label}: "${fact.text}"`,
      });
    }
  }

  for (const label of findForbiddenClaims(output.summary)) {
    violations.push({
      code: 'forbidden_clinical_claim',
      message: `Summary contains ${label}`,
    });
  }

  for (const action of output.proposedActions) {
    if (action.evidenceReferenceIds.length === 0) {
      violations.push({
        code: 'action_without_evidence',
        message: `Proposed action ${action.type} has no evidence references`,
      });
    }
    for (const refId of action.evidenceReferenceIds) {
      if (!context.allowedEvidenceReferenceIds.has(refId)) {
        violations.push({
          code: 'unresolvable_evidence_reference',
          message: `Action ${action.type} cites evidence outside the run's bundle: ${refId}`,
        });
      }
    }
    for (const label of findForbiddenClaims(action.reason)) {
      violations.push({
        code: 'forbidden_clinical_claim',
        message: `Proposed action reason contains ${label}`,
      });
    }
  }

  if (
    context.deterministicStatus === 'urgent' &&
    output.proposedStatus !== undefined &&
    output.proposedStatus !== 'urgent'
  ) {
    violations.push({
      code: 'urgent_downgrade',
      message: `Model proposed ${output.proposedStatus} but deterministic rules produced urgent; deterministic urgent has priority`,
    });
  }

  if (context.requiredInputMissing && !output.abstain) {
    violations.push({
      code: 'missing_abstention',
      message: 'Required inputs are missing; the output must abstain instead of inventing content',
    });
  }

  return { ok: violations.length === 0, violations };
}
