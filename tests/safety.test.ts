import type { SafeAgentOutput } from '../src/domain/models';
import { findForbiddenClaims, verifySafeAgentOutput } from '../src/domain/safety';

const allowed = new Set(['ev-1', 'ev-2']);

function output(partial: Partial<SafeAgentOutput> = {}): SafeAgentOutput {
  return {
    summary: 'Two of four expected doses were confirmed.',
    facts: [{ text: '2 of 4 expected doses confirmed.', evidenceReferenceIds: ['ev-1'] }],
    proposedActions: [],
    conflicts: [],
    missingInformation: [],
    uncertainty: [],
    abstain: false,
    ...partial,
  };
}

describe('findForbiddenClaims', () => {
  it('flags medication advice, diagnosis, and treatment verdicts', () => {
    expect(findForbiddenClaims('You should stop taking the medication now.')).not.toHaveLength(0);
    expect(findForbiddenClaims('Please double the dose tonight.')).not.toHaveLength(0);
    expect(findForbiddenClaims('The patient has an infection.')).not.toHaveLength(0);
    expect(findForbiddenClaims('Treatment has failed.')).not.toHaveLength(0);
  });

  it('does not flag neutral workflow facts', () => {
    expect(findForbiddenClaims('Patient reported a fever on the latest check-in.')).toHaveLength(0);
    expect(findForbiddenClaims('2 of 4 expected doses confirmed.')).toHaveLength(0);
  });
});

describe('verifySafeAgentOutput', () => {
  it('accepts a clean, evidence-linked output', () => {
    const verdict = verifySafeAgentOutput(output(), { allowedEvidenceReferenceIds: allowed });
    expect(verdict.ok).toBe(true);
  });

  it('rejects a fact citing evidence outside the run bundle', () => {
    const verdict = verifySafeAgentOutput(
      output({ facts: [{ text: 'Something.', evidenceReferenceIds: ['ev-999'] }] }),
      { allowedEvidenceReferenceIds: allowed },
    );
    expect(verdict.ok).toBe(false);
    expect(verdict.violations[0].code).toBe('unresolvable_evidence_reference');
  });

  it('rejects forbidden clinical claims in facts and summaries', () => {
    const verdict = verifySafeAgentOutput(
      output({ summary: 'The patient should stop taking the medicine.' }),
      { allowedEvidenceReferenceIds: allowed },
    );
    expect(verdict.ok).toBe(false);
    expect(verdict.violations.some((v) => v.code === 'forbidden_clinical_claim')).toBe(true);
  });

  it('blocks a model attempt to downgrade a deterministic urgent result', () => {
    const verdict = verifySafeAgentOutput(output({ proposedStatus: 'review' }), {
      allowedEvidenceReferenceIds: allowed,
      deterministicStatus: 'urgent',
    });
    expect(verdict.ok).toBe(false);
    expect(verdict.violations.some((v) => v.code === 'urgent_downgrade')).toBe(true);
  });

  it('requires abstention when required inputs are missing', () => {
    const verdict = verifySafeAgentOutput(output(), {
      allowedEvidenceReferenceIds: allowed,
      requiredInputMissing: true,
    });
    expect(verdict.ok).toBe(false);
    expect(verdict.violations.some((v) => v.code === 'missing_abstention')).toBe(true);

    const abstaining = verifySafeAgentOutput(
      output({ abstain: true, abstentionReason: 'check-in missing', facts: [] }),
      { allowedEvidenceReferenceIds: allowed, requiredInputMissing: true },
    );
    expect(abstaining.ok).toBe(true);
  });

  it('rejects proposed actions without evidence', () => {
    const verdict = verifySafeAgentOutput(
      output({
        proposedActions: [
          {
            type: 'create_review_item',
            reason: 'because',
            evidenceReferenceIds: [],
            requiresApproval: false,
          },
        ],
      }),
      { allowedEvidenceReferenceIds: allowed },
    );
    expect(verdict.ok).toBe(false);
    expect(verdict.violations.some((v) => v.code === 'action_without_evidence')).toBe(true);
  });
});
