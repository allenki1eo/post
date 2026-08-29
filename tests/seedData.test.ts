import { calculateAdherence } from '../src/domain/adherence';
import { evaluateGrantAccess } from '../src/domain/passport';
import { findRecordConflicts } from '../src/domain/provenance';
import { evaluateWorkflowRules } from '../src/domain/workflowRules';
import { loadSeedData } from '../src/repositories/seedLoader';

const seed = loadSeedData();

// Demo plain tokens whose hashes are seeded by tools/generate-seeds.mjs. The
// seed files themselves store only the SHA-256 hashes.
const DEMO_PLAIN_TOKENS = {
  active: 'POSTDEMOACTIVEGRANTA2345',
  expired: 'POSTDEMOEXPIREDGRANTB234',
  revoked: 'POSTDEMOREVOKEDGRANTC234',
  overuse: 'POSTDEMOOVERUSEGRANTD234',
};

describe('seed data integrity', () => {
  it('loads and validates all seed files against the canonical schemas', () => {
    expect(seed.templates).toHaveLength(4);
    expect(seed.cases.length).toBeGreaterThanOrEqual(12);
    expect(seed.passports.length).toBeGreaterThanOrEqual(4);
    expect(seed.agentRuns.length).toBeGreaterThanOrEqual(12);
  });

  it('marks every person, case, passport, and run as synthetic', () => {
    expect(seed.patients.every((p) => p.synthetic)).toBe(true);
    expect(seed.cases.every((c) => c.synthetic)).toBe(true);
    expect(seed.passports.every((p) => p.synthetic)).toBe(true);
    expect(seed.agentRuns.every((r) => r.synthetic)).toBe(true);
  });

  it('labels every template as pending clinical review with the demo label', () => {
    for (const template of seed.templates) {
      expect(template.clinicalReview.status).toBe('pending_review');
      expect(template.clinicalReview.demoLabel).toBe(
        'FOR DEMONSTRATION - CLINICAL REVIEW REQUIRED',
      );
    }
  });

  it('covers one on_track, one review, and one urgent case per journey', () => {
    const journeys = new Set(seed.cases.map((c) => c.journeyType));
    expect(journeys.size).toBe(4);
    for (const journey of journeys) {
      const labels = seed.cases
        .filter((c) => c.journeyType === journey)
        .map((c) => c.expectedLabel);
      expect(labels.sort()).toEqual(['on_track', 'review', 'urgent']);
    }
  });
});

describe('follow-up cases reproduce their expected labels deterministically', () => {
  it.each(seed.cases.map((c) => [c.id, c] as const))('%s', (_id, followUpCase) => {
    const template = seed.templates.find((t) => t.id === followUpCase.templateId)!;
    expect(template.version).toBe(followUpCase.templateVersion);

    const evaluation = evaluateWorkflowRules({
      rules: template.workflowRules,
      checkIns: followUpCase.checkIns,
      triggeringCheckIn: followUpCase.checkIns[followUpCase.checkIns.length - 1],
      missedCheckInScheduleIds: followUpCase.missedCheckInScheduleIds,
    });

    expect(evaluation.status).toBe(followUpCase.expectedLabel);
    expect(evaluation.matchedRules.map((m) => m.ruleId).sort()).toEqual(
      [...followUpCase.expectedMatchedRuleIds].sort(),
    );

    // Every expected evidence reference is actually produced by the engine.
    const produced = evaluation.matchedRules.flatMap((m) =>
      m.evidenceReferences.map((r) => `${r.type}:${r.id}`),
    );
    for (const expected of followUpCase.expectedEvidenceReferences) {
      expect(produced).toContain(`${expected.type}:${expected.id}`);
    }

    // Adherence stays reproducible and confirmed ⊆ expected (schema-enforced,
    // re-asserted here).
    const adherence = calculateAdherence(followUpCase.checkIns);
    if (adherence.kind === 'ratio') {
      expect(adherence.confirmed).toBeLessThanOrEqual(adherence.expected);
    }
  });
});

describe('care passports', () => {
  it('covers all four source types and all four medication statuses across the set', () => {
    const sourceTypes = new Set(seed.passports.flatMap((p) => p.records.map((r) => r.sourceType)));
    expect([...sourceTypes].sort()).toEqual([
      'ai_organized',
      'clinician_verified',
      'facility_imported',
      'patient_reported',
    ]);
    const medStatuses = new Set(
      seed.passports.flatMap((p) =>
        p.records
          .filter((r) => r.category === 'medications')
          .map((r) => (r as { status: string }).status),
      ),
    );
    expect([...medStatuses].sort()).toEqual(['active', 'completed', 'stopped', 'unknown']);
  });

  it('has provenance for every record', () => {
    for (const passport of seed.passports) {
      const covered = new Set(passport.provenance.map((p) => p.recordId));
      for (const record of passport.records) {
        expect(covered.has(record.id)).toBe(true);
      }
    }
  });

  it('declares exactly the conflicts the deterministic detector finds', () => {
    for (const passport of seed.passports) {
      expect(passport.snapshot.conflictRecordGroups).toEqual(findRecordConflicts(passport.records));
    }
  });

  it('keeps each patient correction separate from the disputed source record', () => {
    for (const passport of seed.passports) {
      const corrections = passport.records.filter(
        (r) => r.sourceType === 'patient_reported' && r.disputesRecordId,
      );
      expect(corrections.length).toBeGreaterThanOrEqual(1);
      for (const correction of corrections) {
        const source = passport.records.find((r) => r.id === correction.disputesRecordId)!;
        expect(source).toBeDefined();
        expect(source.sourceType).not.toBe('patient_reported');
        expect(source.verificationStatus).toBe('disputed');
      }
    }
  });

  it('contains an explicitly unavailable observation value instead of a fabricated one', () => {
    const observations = seed.passports.flatMap((p) =>
      p.records.filter((r) => r.category === 'observations'),
    );
    expect(observations.some((o) => (o as { value?: string }).value === undefined)).toBe(true);
  });

  it('stores only token hashes and honors grant states via the policy engine', () => {
    const grants = seed.passports.flatMap((p) => p.shareGrants);
    for (const grant of grants) {
      expect(grant.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    }
    const NOW = '2026-08-25T09:00:00.000Z';
    expect(
      evaluateGrantAccess(grants, { presentedToken: DEMO_PLAIN_TOKENS.active, nowIso: NOW })
        .outcome,
    ).toBe('allowed');
    expect(
      evaluateGrantAccess(grants, { presentedToken: DEMO_PLAIN_TOKENS.expired, nowIso: NOW })
        .outcome,
    ).toBe('expired');
    expect(
      evaluateGrantAccess(grants, { presentedToken: DEMO_PLAIN_TOKENS.revoked, nowIso: NOW })
        .outcome,
    ).toBe('revoked');
    expect(
      evaluateGrantAccess(grants, { presentedToken: DEMO_PLAIN_TOKENS.overuse, nowIso: NOW })
        .outcome,
    ).toBe('over_use_limit');
    expect(
      evaluateGrantAccess(grants, { presentedToken: 'NOTAREALTOKENAAAAAAAAA23', nowIso: NOW })
        .outcome,
    ).toBe('denied');
  });

  it('records allowed and denied access events', () => {
    const outcomes = new Set(seed.passports.flatMap((p) => p.accessEvents.map((e) => e.outcome)));
    expect(outcomes.has('allowed')).toBe(true);
    expect([...outcomes].some((o) => o !== 'allowed')).toBe(true);
  });
});

describe('agent run fixtures', () => {
  it('covers every allowed trigger and every terminal outcome family', () => {
    const triggers = new Set(seed.agentRuns.map((r) => r.run.trigger));
    expect([...triggers].sort()).toEqual([
      'care_plan_changed',
      'check_in_missed',
      'check_in_submitted',
      'clinician_requested_review',
      'passport_summary_requested',
    ]);
    const outcomes = new Set(seed.agentRuns.map((r) => r.expectedOutcome));
    for (const outcome of [
      'no_review_needed',
      'review_item_created',
      'urgent_review_item_created',
      'awaiting_clinician_approval',
      'approved_action_executed',
      'passport_summary_created',
      'abstained_missing_information',
      'blocked_by_safety_policy',
      'failed_recoverably',
    ]) {
      expect(outcomes.has(outcome as never)).toBe(true);
    }
  });

  it('includes model-enabled and model-disabled paths', () => {
    expect(seed.agentRuns.some((r) => r.modelDisabledPathEquivalent)).toBe(true);
    expect(seed.agentRuns.some((r) => !r.modelDisabledPathEquivalent)).toBe(true);
  });

  it('gives every run non-empty input references', () => {
    for (const fixture of seed.agentRuns) {
      expect(fixture.run.inputReferences.length).toBeGreaterThan(0);
    }
  });
});
