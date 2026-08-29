import type { CheckInResponse, WorkflowRule } from '../src/domain/models';
import { evaluateWorkflowRules } from '../src/domain/workflowRules';

const text = { en: 'x', sw: 'x' };

function makeRule(
  partial: Partial<WorkflowRule> & { id: string; condition: WorkflowRule['condition'] },
): WorkflowRule {
  return {
    priority: 'review',
    description: text,
    messageOnMatch: text,
    missingDataBehavior: 'ignore',
    ...partial,
  };
}

function makeCheckIn(partial: Partial<CheckInResponse> & { id: string }): CheckInResponse {
  return {
    scheduleId: `sch-${partial.id}`,
    carePlanId: 'plan-1',
    patientId: 'patient-1',
    answers: [],
    expectedDoseIds: [],
    confirmedDoseIds: [],
    completedAt: `2026-08-1${partial.id.length}T19:00:00.000Z`,
    deviceCreatedAt: '2026-08-19T19:00:00.000Z',
    syncStatus: 'synced',
    ...partial,
  };
}

const feverRule = makeRule({
  id: 'r-fever',
  condition: { kind: 'answer_equals', questionId: 'q-fever', value: true },
});
const urgentRule = makeRule({
  id: 'r-bleeding',
  priority: 'urgent',
  condition: { kind: 'answer_equals', questionId: 'q-bleeding', value: true },
});

describe('evaluateWorkflowRules', () => {
  it('returns on_track when nothing matches', () => {
    const checkIn = makeCheckIn({
      id: 'a',
      answers: [
        { questionId: 'q-fever', value: false },
        { questionId: 'q-bleeding', value: false },
      ],
    });
    const result = evaluateWorkflowRules({
      rules: [feverRule, urgentRule],
      checkIns: [checkIn],
      triggeringCheckIn: checkIn,
    });
    expect(result.status).toBe('on_track');
    expect(result.matchedRules).toEqual([]);
  });

  it('gives urgent precedence over review', () => {
    const checkIn = makeCheckIn({
      id: 'a',
      answers: [
        { questionId: 'q-fever', value: true },
        { questionId: 'q-bleeding', value: true },
      ],
    });
    const result = evaluateWorkflowRules({
      rules: [feverRule, urgentRule],
      checkIns: [checkIn],
      triggeringCheckIn: checkIn,
    });
    expect(result.status).toBe('urgent');
    expect(result.matchedRules.map((m) => m.ruleId).sort()).toEqual(['r-bleeding', 'r-fever']);
  });

  it('links every match to rule and answer evidence', () => {
    const checkIn = makeCheckIn({ id: 'a', answers: [{ questionId: 'q-fever', value: true }] });
    const result = evaluateWorkflowRules({
      rules: [feverRule],
      checkIns: [checkIn],
      triggeringCheckIn: checkIn,
    });
    expect(result.matchedRules[0].evidenceReferences).toEqual([
      { type: 'rule', id: 'r-fever' },
      { type: 'check_in', id: 'a' },
      { type: 'answer', id: 'a:q-fever' },
    ]);
  });

  it('treats a missing answer as missing data, not as a match', () => {
    const checkIn = makeCheckIn({ id: 'a', answers: [] });
    const result = evaluateWorkflowRules({
      rules: [feverRule],
      checkIns: [checkIn],
      triggeringCheckIn: checkIn,
    });
    expect(result.status).toBe('on_track');
  });

  it('flags missing data for review when the rule says so', () => {
    const flagRule = makeRule({
      id: 'r-flag',
      condition: { kind: 'answer_equals', questionId: 'q-x', value: true },
      missingDataBehavior: 'flag_for_review',
    });
    const checkIn = makeCheckIn({ id: 'a', answers: [] });
    const result = evaluateWorkflowRules({
      rules: [flagRule],
      checkIns: [checkIn],
      triggeringCheckIn: checkIn,
    });
    expect(result.status).toBe('review');
    expect(result.missingDataReviewRuleIds).toEqual(['r-flag']);
  });

  it('matches adherence_below only past the minimum expected doses', () => {
    const adherenceRule = makeRule({
      id: 'r-adherence',
      condition: { kind: 'adherence_below', threshold: 0.8, minimumExpectedDoses: 4 },
    });
    const lowVolume = makeCheckIn({ id: 'a', expectedDoseIds: ['d1', 'd2'], confirmedDoseIds: [] });
    expect(evaluateWorkflowRules({ rules: [adherenceRule], checkIns: [lowVolume] }).status).toBe(
      'on_track',
    );

    const enough = [
      makeCheckIn({ id: 'a', expectedDoseIds: ['d1', 'd2'], confirmedDoseIds: ['d1'] }),
      makeCheckIn({ id: 'b', expectedDoseIds: ['d3', 'd4'], confirmedDoseIds: ['d3'] }),
    ];
    const result = evaluateWorkflowRules({ rules: [adherenceRule], checkIns: enough });
    expect(result.status).toBe('review');
    expect(result.matchedRules[0].evidenceReferences).toContainEqual({
      type: 'adherence_calculation',
      id: 'adherence:2/4',
    });
  });

  it('matches missed_check_ins with schedule evidence', () => {
    const missedRule = makeRule({
      id: 'r-missed',
      condition: { kind: 'missed_check_ins', count: 2 },
    });
    const result = evaluateWorkflowRules({
      rules: [missedRule],
      checkIns: [],
      missedCheckInScheduleIds: ['sch-1', 'sch-2'],
    });
    expect(result.status).toBe('review');
    expect(result.matchedRules[0].evidenceReferences).toContainEqual({
      type: 'schedule',
      id: 'sch-1',
    });
  });

  it('matches condition_worse_streak only for a full streak', () => {
    const streakRule = makeRule({
      id: 'r-streak',
      condition: { kind: 'condition_worse_streak', questionId: 'q-overall', count: 2 },
    });
    const worse = (id: string, completedAt: string) =>
      makeCheckIn({ id, answers: [{ questionId: 'q-overall', value: 'worse' }], completedAt });
    const same = (id: string, completedAt: string) =>
      makeCheckIn({ id, answers: [{ questionId: 'q-overall', value: 'same' }], completedAt });

    expect(
      evaluateWorkflowRules({
        rules: [streakRule],
        checkIns: [worse('a', '2026-08-18T19:00:00.000Z'), same('b', '2026-08-19T19:00:00.000Z')],
      }).status,
    ).toBe('on_track');

    expect(
      evaluateWorkflowRules({
        rules: [streakRule],
        checkIns: [worse('a', '2026-08-18T19:00:00.000Z'), worse('b', '2026-08-19T19:00:00.000Z')],
      }).status,
    ).toBe('review');
  });
});
