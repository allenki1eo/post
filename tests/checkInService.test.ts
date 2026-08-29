import { submitCheckIn } from '../src/features/checkIns/checkInService';
import { describeDose } from '../src/features/checkIns/doses';
import {
  localDayRange,
  missedScheduleIds,
  scheduleIdFor,
  todaysSchedule,
} from '../src/features/checkIns/schedule';
import { MemoryLocalStore } from '../src/storage/memoryStore';
import { loadSeedData } from '../src/repositories/seedLoader';

const seed = loadSeedData();
const urgentCase = seed.cases.find((c) => c.id === 'case-mp-urgent')!;
const template = seed.templates.find((t) => t.id === urgentCase.templateId)!;
const plan = urgentCase.carePlan;
const TZ = 'Africa/Dar_es_Salaam';

/** 12:00 local on the plan's second day. */
const NOW = '2026-08-19T09:00:00.000Z';

let counter = 0;
const idFactory = () => `id-${++counter}`;

beforeEach(() => {
  counter = 0;
});

describe('local day scheduling', () => {
  it('resolves the local calendar day for a +03:00 timezone', () => {
    // 22:30 UTC is already the next local day in Dar es Salaam.
    expect(localDayRange('2026-08-19T22:30:00.000Z', TZ).localDate).toBe('2026-08-20');
    expect(localDayRange('2026-08-19T22:30:00.000Z', 'UTC').localDate).toBe('2026-08-19');
  });

  it('produces a stable schedule id per plan per local day', () => {
    const a = todaysSchedule(plan, TZ, NOW);
    const b = todaysSchedule(plan, TZ, '2026-08-19T15:00:00.000Z');
    expect(a.scheduleId).toBe(b.scheduleId);
    expect(a.scheduleId).toBe(scheduleIdFor(plan.id, '2026-08-19'));
  });

  it('clamps the plan day to the plan length', () => {
    const late = todaysSchedule(plan, TZ, '2027-01-01T09:00:00.000Z');
    expect(late.planDay).toBe(late.planTotalDays);
  });

  it('counts only past days without a check-in as missed', () => {
    const missed = missedScheduleIds(plan, TZ, NOW, [scheduleIdFor(plan.id, '2026-08-18')]);
    // Day one is accounted for and today is not missed until it ends.
    expect(missed).toEqual([]);
  });

  it('describes a dose with the clinician display name and local time', () => {
    const schedule = todaysSchedule(plan, TZ, NOW);
    const described = describeDose(schedule.expectedDoseIds[0], plan, TZ);
    expect(described.displayName).toBe('Paracetamol 500 mg');
    // 08:00 UTC renders as 11:00 local.
    expect(described.localTime).toBe('11:00');
  });
});

describe('submitCheckIn', () => {
  async function freshStore() {
    const store = new MemoryLocalStore();
    await store.init();
    return store;
  }

  it('saves the check-in and enqueues exactly one outbox operation', async () => {
    const store = await freshStore();
    const schedule = todaysSchedule(plan, TZ, NOW);

    const result = await submitCheckIn({
      store,
      patientId: urgentCase.patientId,
      timezone: TZ,
      carePlan: plan,
      template,
      draft: {
        answers: [{ questionId: 'q-mp-bleeding', value: false }],
        confirmedDoseIds: schedule.expectedDoseIds,
      },
      nowIso: NOW,
      idFactory,
    });

    expect(result.checkIn.syncStatus).toBe('local');
    expect(result.checkIn.confirmedDoseIds).toEqual(schedule.expectedDoseIds);
    expect(await store.listOperations()).toHaveLength(1);
    expect(await store.countUnsyncedCheckIns()).toBe(1);
  });

  it('shows the clinic-authored urgent instruction when an urgent rule matches, with no model', async () => {
    const store = await freshStore();
    const result = await submitCheckIn({
      store,
      patientId: urgentCase.patientId,
      timezone: TZ,
      carePlan: plan,
      template,
      draft: {
        answers: [
          { questionId: 'q-mp-bleeding', value: true },
          { questionId: 'q-mp-overall', value: 'worse' },
        ],
        confirmedDoseIds: [],
      },
      nowIso: NOW,
      idFactory,
    });

    expect(result.status).toBe('urgent');
    expect(result.urgentInstructions).toHaveLength(1);
    expect(result.urgentInstructions[0].ruleId).toBe('rule-mp-bleeding');
    // The wording is the clinic's own, in both languages.
    expect(result.urgentInstructions[0].message.en).toContain('SAMPLE TEXT');
    expect(result.urgentInstructions[0].message.sw).toContain('MAANDISHI YA MFANO');
    expect(result.planUrgentInstructions.sw).toContain('MAANDISHI YA MFANO');
  });

  it('never records a confirmation for a dose that was not expected today', async () => {
    const store = await freshStore();
    const result = await submitCheckIn({
      store,
      patientId: urgentCase.patientId,
      timezone: TZ,
      carePlan: plan,
      template,
      draft: {
        answers: [],
        confirmedDoseIds: ['not-a-scheduled-dose', 'med-paracetamol@2026-08-19T08:00'],
      },
      nowIso: NOW,
      idFactory,
    });
    expect(result.checkIn.confirmedDoseIds).toEqual(['med-paracetamol@2026-08-19T08:00']);
  });

  it('is idempotent when the same answers are submitted twice', async () => {
    const store = await freshStore();
    const draft = { answers: [{ questionId: 'q-mp-fever', value: false }], confirmedDoseIds: [] };
    const first = await submitCheckIn({
      store,
      patientId: urgentCase.patientId,
      timezone: TZ,
      carePlan: plan,
      template,
      draft,
      nowIso: NOW,
      idFactory,
    });
    const second = await submitCheckIn({
      store,
      patientId: urgentCase.patientId,
      timezone: TZ,
      carePlan: plan,
      template,
      draft,
      nowIso: '2026-08-19T09:05:00.000Z',
      idFactory,
    });

    expect(second.checkIn.id).toBe(first.checkIn.id);
    expect(second.checkIn.revision).toBe(1);
    expect(second.replacedLocalRevision).toBe(false);
    expect(await store.listCheckIns(urgentCase.patientId)).toHaveLength(1);
    expect(await store.listOperations()).toHaveLength(1);
  });

  it('creates a new revision (and a new operation) when the patient edits before sync', async () => {
    const store = await freshStore();
    const base = {
      store,
      patientId: urgentCase.patientId,
      timezone: TZ,
      carePlan: plan,
      template,
      idFactory,
    };
    const first = await submitCheckIn({
      ...base,
      draft: { answers: [{ questionId: 'q-mp-fever', value: false }], confirmedDoseIds: [] },
      nowIso: NOW,
    });
    const edited = await submitCheckIn({
      ...base,
      draft: { answers: [{ questionId: 'q-mp-fever', value: true }], confirmedDoseIds: [] },
      nowIso: '2026-08-19T09:10:00.000Z',
    });

    expect(edited.checkIn.id).toBe(first.checkIn.id);
    expect(edited.checkIn.revision).toBe(2);
    expect(edited.replacedLocalRevision).toBe(true);
    // History is preserved as two distinct operations to send.
    const operations = await store.listOperations();
    expect(operations).toHaveLength(2);
    expect(new Set(operations.map((op) => op.idempotencyKey)).size).toBe(2);
  });

  it('preserves the response against its original template version', async () => {
    const store = await freshStore();
    const result = await submitCheckIn({
      store,
      patientId: urgentCase.patientId,
      timezone: TZ,
      carePlan: plan,
      template,
      draft: { answers: [], confirmedDoseIds: [] },
      nowIso: NOW,
      idFactory,
    });
    expect(result.checkIn.carePlanId).toBe(plan.id);
    const stored = await store.getCheckIn(result.checkIn.id);
    expect(stored?.carePlanId).toBe(plan.id);
    // The care plan pins the reviewed template version the answers belong to.
    expect(plan.templateVersion).toBe(template.version);
  });
});
