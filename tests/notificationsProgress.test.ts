import { summarizeProgress } from '../src/features/checkIns/progress';
import { planNotifications } from '../src/features/notifications/plan';
import { loadSeedData } from '../src/repositories/seedLoader';
import type { StoredCheckIn } from '../src/storage/types';

const seed = loadSeedData();
const followUp = seed.cases.find((c) => c.id === 'case-ab-review')!;
const template = seed.templates.find((t) => t.id === followUp.templateId)!;
const plan = followUp.carePlan;
const TZ = 'Africa/Dar_es_Salaam';
const NOW = '2026-08-19T06:00:00.000Z';

const STRINGS = {
  medicationTitle: 'POST',
  checkInTitle: 'POST',
  checkInBody: 'Time for your short daily check-in.',
  neutralBody: 'Time for your short daily check-in.',
};

describe('planNotifications', () => {
  it('schedules nothing when reminders are disabled', () => {
    const planned = planNotifications({
      carePlan: plan,
      timezone: TZ,
      language: 'en',
      preferences: { enabled: false, showPreviews: true },
      strings: STRINGS,
      nowIso: NOW,
    });
    expect(planned).toEqual([]);
  });

  it('keeps the medicine name off the lock screen by default', () => {
    const planned = planNotifications({
      carePlan: plan,
      timezone: TZ,
      language: 'en',
      preferences: { enabled: true, showPreviews: false },
      strings: STRINGS,
      nowIso: NOW,
    });
    const medication = planned.filter((n) => n.kind === 'medication_reminder');
    expect(medication.length).toBeGreaterThan(0);
    for (const notification of medication) {
      expect(notification.body).toBe(STRINGS.neutralBody);
      expect(notification.body).not.toMatch(/amoxicillin/i);
      expect(notification.title).not.toMatch(/amoxicillin/i);
    }
  });

  it('uses the clinician wording verbatim once the patient opts into previews', () => {
    const planned = planNotifications({
      carePlan: plan,
      timezone: TZ,
      language: 'en',
      preferences: { enabled: true, showPreviews: true },
      strings: STRINGS,
      nowIso: NOW,
    });
    const medication = planned.find((n) => n.kind === 'medication_reminder')!;
    expect(medication.body).toBe(plan.medicationInstructions[0].clinicianWording.en);
  });

  it('renders reminder copy from the selected language bundle', () => {
    const planned = planNotifications({
      carePlan: plan,
      timezone: TZ,
      language: 'sw',
      preferences: { enabled: true, showPreviews: true },
      strings: STRINGS,
      nowIso: NOW,
    });
    const medication = planned.find((n) => n.kind === 'medication_reminder')!;
    expect(medication.body).toBe(plan.medicationInstructions[0].clinicianWording.sw);
  });

  it('never reveals a symptom or status in check-in reminder copy, and deep-links to the task', () => {
    const planned = planNotifications({
      carePlan: plan,
      timezone: TZ,
      language: 'en',
      preferences: { enabled: true, showPreviews: true },
      strings: STRINGS,
      nowIso: NOW,
    });
    const checkIn = planned.find((n) => n.kind === 'check_in_due')!;
    expect(checkIn.body).toBe(STRINGS.checkInBody);
    expect(checkIn.route).toContain('/(patient)/check-in/');
  });

  it('only schedules future triggers, with stable ids for a full replace', () => {
    const planned = planNotifications({
      carePlan: plan,
      timezone: TZ,
      language: 'en',
      preferences: { enabled: true, showPreviews: false },
      strings: STRINGS,
      nowIso: NOW,
    });
    expect(planned.length).toBeGreaterThan(0);
    for (const notification of planned) {
      expect(Date.parse(notification.triggerAtIso)).toBeGreaterThan(Date.parse(NOW));
    }
    expect(new Set(planned.map((n) => n.id)).size).toBe(planned.length);

    const again = planNotifications({
      carePlan: plan,
      timezone: TZ,
      language: 'en',
      preferences: { enabled: true, showPreviews: false },
      strings: STRINGS,
      nowIso: NOW,
    });
    expect(again.map((n) => n.id)).toEqual(planned.map((n) => n.id));
  });
});

describe('summarizeProgress', () => {
  const stored = (partial: Partial<StoredCheckIn> & { id: string }): StoredCheckIn => ({
    scheduleId: `${plan.id}:2026-08-18`,
    carePlanId: plan.id,
    patientId: followUp.patientId,
    answers: [],
    expectedDoseIds: [],
    confirmedDoseIds: [],
    completedAt: '2026-08-18T19:00:00.000Z',
    deviceCreatedAt: '2026-08-18T19:00:00.000Z',
    syncStatus: 'synced',
    revision: 1,
    ...partial,
  });

  it('counts reported values and missing answers separately', () => {
    const summary = summarizeProgress(
      [
        stored({
          id: 'a',
          answers: [
            { questionId: 'q-ab-overall', value: 'better' },
            { questionId: 'q-ab-fever', value: true },
          ],
        }),
        stored({
          id: 'b',
          // No answer at all for fever: missing, not a "no".
          answers: [{ questionId: 'q-ab-overall', value: 'same' }],
        }),
      ],
      plan,
      template,
      TZ,
      NOW,
    );

    const condition = summary.questions.find((q) => q.kind === 'condition')!;
    expect(condition.reportedCount).toBe(1);
    expect(condition.total).toBe(2);

    const fever = summary.questions.find((q) => q.questionId === 'q-ab-fever')!;
    expect(fever.reportedCount).toBe(1);
    expect(fever.missingCount).toBe(1);
  });

  it('reports adherence as a fraction and never as a score', () => {
    const summary = summarizeProgress(
      [stored({ id: 'a', expectedDoseIds: ['d1', 'd2'], confirmedDoseIds: ['d1'] })],
      plan,
      template,
      TZ,
      NOW,
    );
    expect(summary.adherence).toMatchObject({ kind: 'ratio', confirmed: 1, expected: 2 });
  });

  it('returns not_applicable adherence when no doses were expected', () => {
    const summary = summarizeProgress([stored({ id: 'a' })], plan, template, TZ, NOW);
    expect(summary.adherence.kind).toBe('not_applicable');
  });

  it('does not summarize a 0-10 scale as a count', () => {
    const hypertension = seed.templates.find((t) => t.journeyType === 'hypertension_medication')!;
    const summary = summarizeProgress([stored({ id: 'a' })], plan, hypertension, TZ, NOW);
    expect(summary.questions.some((q) => q.question.type === 'number')).toBe(false);
  });
});
