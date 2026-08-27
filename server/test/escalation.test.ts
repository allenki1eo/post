import { describe, expect, it } from 'vitest';
import { pool, query } from '../src/db.js';
import { expandPlanWindow } from '../src/domain/scheduling.js';
import { tick } from '../src/worker.js';
import { fakeSms } from './setup.js';
import { addPatient, addStandardPlan, api, at, plusDays, registerDoctor, today } from './helpers.js';

const reply = (phone: string, text: string, id: string) =>
  api().post('/api/webhooks/sms/inbound').type('form')
    .send({ from: phone, to: '15629', text, id }).expect(200);

/** Send the first dose reminder and let the grace period expire unanswered. */
async function missOneDose(start: string, time: string, graceAt: string) {
  await tick(at(start, time === '08:00' ? '08:01' : '20:01'));
  return tick(at(start, graceAt));
}

describe('silence becomes an alert', () => {
  it('raises missed_meds after two consecutive unanswered doses', async () => {
    const doctor = await registerDoctor();
    const patient = await addPatient(doctor);
    const { start } = await addStandardPlan(doctor, patient.id);

    const afterFirst = await missOneDose(start, '08:00', '11:30');
    expect(afterFirst.missedDoses).toBe(1);
    // One miss is a bad morning, not an alert.
    expect(afterFirst.alertsRaised).toBe(0);

    const afterSecond = await missOneDose(start, '20:00', '23:30');
    expect(afterSecond.alertsRaised).toBe(1);

    const triage = await doctor.auth(api().get('/api/triage')).expect(200);
    expect(triage.body.counts).toMatchObject({ critical: 0, warning: 1 });

    const [entry] = triage.body.needs_attention;
    expect(entry.patient.name).toBe('Asha Mrisho');
    expect(entry.severity).toBe('warning');
    // Urgency never rests on colour alone: every reason carries a label and icon.
    expect(entry.reasons[0]).toMatchObject({
      type: 'missed_meds',
      label_sw: 'Dawa haikunywewa',
      label_en: 'Missed meds',
      icon: 'clock-alert',
    });
    expect(entry.reasons[0].context).toMatchObject({ consecutive_misses: 2 });
  });

  it('returns a dose strip of what already happened, oldest first', async () => {
    const doctor = await registerDoctor();
    const patient = await addPatient(doctor);
    const start = plusDays(today(), -2);
    const plan = await addStandardPlan(doctor, patient.id, start);

    // Creating a plan only schedules future doses — it never backfills. To have
    // history to look at, expand from before the first dose, as the seeder does.
    const client = await pool.connect();
    try {
      await expandPlanWindow(client, plan.care_plan_id, { now: at(start, '00:01') });
    } finally {
      client.release();
    }

    await tick(at(start, '08:01'));
    await reply(patient.phone, '1', 'strip-taken');
    await tick(at(start, '20:01'));
    await tick(at(start, '23:50'));
    await tick(at(plusDays(start, 1), '08:01'));
    await tick(at(plusDays(start, 1), '11:30'));

    const triage = await doctor.auth(api().get('/api/triage')).expect(200);
    const strip = triage.body.needs_attention[0].dose_strip;
    // Oldest first, so the strip reads left to right like a calendar. The tail
    // is whatever is still waiting, which depends on the hour the test runs.
    expect(strip.slice(0, 3)).toEqual(['taken', 'missed', 'missed']);
  });

  it('clears the alert once the patient answers again', async () => {
    const doctor = await registerDoctor();
    const patient = await addPatient(doctor);
    const { start } = await addStandardPlan(doctor, patient.id);

    await missOneDose(start, '08:00', '11:30');
    await missOneDose(start, '20:00', '23:30');
    expect((await doctor.auth(api().get('/api/triage'))).body.counts.warning).toBe(1);

    await tick(at(plusDays(start, 1), '08:01'));
    await reply(patient.phone, 'ndiyo', 'at-back-on-track');

    const triage = await doctor.auth(api().get('/api/triage')).expect(200);
    expect(triage.body.needs_attention).toHaveLength(0);
    expect(triage.body.counts.stable).toBe(1);
  });

  it('escalates a red flag immediately, with no threshold, above any warning', async () => {
    const doctor = await registerDoctor();

    const missing = await addPatient(doctor, { name: 'Juma Said' });
    const plan = await addStandardPlan(doctor, missing.id);
    await missOneDose(plan.start, '08:00', '11:30');
    await missOneDose(plan.start, '20:00', '23:30');

    const unwell = await addPatient(doctor, { name: 'Neema Paul' });
    const unwellPlan = await addStandardPlan(doctor, unwell.id);
    await tick(at(unwellPlan.start, '08:01'));
    await reply(unwell.phone, '3', 'at-red-flag');

    const triage = await doctor.auth(api().get('/api/triage')).expect(200);
    expect(triage.body.counts).toMatchObject({ critical: 1, warning: 1 });
    // Sorting does more work than colour: the critical patient is first.
    expect(triage.body.needs_attention[0].patient.name).toBe('Neema Paul');
    expect(triage.body.needs_attention[0].reasons[0]).toMatchObject({
      type: 'red_flag_symptom',
      severity: 'critical',
      label_sw: 'Dalili ya hatari',
    });
    expect(triage.body.needs_attention[1].patient.name).toBe('Juma Said');
  });

  it('surfaces free text to the doctor instead of rejecting it', async () => {
    const doctor = await registerDoctor();
    const patient = await addPatient(doctor);
    const { start } = await addStandardPlan(doctor, patient.id);
    await tick(at(start, '08:01'));

    const text = 'nina maumivu ya kifua tangu jana usiku';
    await reply(patient.phone, text, 'at-free-text');

    const triage = await doctor.auth(api().get('/api/triage')).expect(200);
    expect(triage.body.needs_attention[0].reasons[0]).toMatchObject({
      type: 'unparsed_reply',
      label_en: 'New message',
    });
    // The patient's own words reach the doctor verbatim.
    expect(triage.body.needs_attention[0].reasons[0].context.text).toBe(text);

    const stored = await query<{ body: string; parsed_code: string | null }>(
      `select body, parsed_code from inbound_messages where patient_id = $1`,
      [patient.id],
    );
    expect(stored).toEqual([{ body: text, parsed_code: null }]);
  });

  it('nudges once after "not yet" and leaves the dose open', async () => {
    const doctor = await registerDoctor();
    const patient = await addPatient(doctor);
    const { start } = await addStandardPlan(doctor, patient.id);
    await tick(at(start, '08:01'));

    await reply(patient.phone, '2', 'at-not-yet-1');
    await reply(patient.phone, 'bado', 'at-not-yet-2');

    const nudges = await query(
      `select id from messages where patient_id = $1 and kind = 'checkin_followup'`,
      [patient.id],
    );
    expect(nudges).toHaveLength(1); // two would be nagging

    const open = await query(
      `select id from medication_logs where patient_id = $1 and taken is null`,
      [patient.id],
    );
    expect(open.length).toBeGreaterThan(0);
  });

  it('stops immediately on STOP and tells the doctor', async () => {
    const doctor = await registerDoctor();
    const patient = await addPatient(doctor);
    const { start } = await addStandardPlan(doctor, patient.id);
    await tick(at(start, '08:01'));
    fakeSms.clear();

    await reply(patient.phone, 'ACHA', 'at-stop');

    const queued = await query(
      `select id from messages where patient_id = $1 and status = 'queued'`,
      [patient.id],
    );
    expect(queued).toHaveLength(0);

    // Nothing further goes out, whatever the schedule said.
    await tick(at(start, '20:01'));
    expect(fakeSms.outbox).toHaveLength(0);

    const triage = await doctor.auth(api().get('/api/triage')).expect(200);
    expect(triage.body.needs_attention[0].reasons[0].type).toBe('opted_out');
  });

  it('treats a delivery failure as clinical information', async () => {
    const doctor = await registerDoctor();
    const patient = await addPatient(doctor);
    const { start } = await addStandardPlan(doctor, patient.id);
    await tick(at(start, '08:01'));

    const providerId = fakeSms.last!.providerMessageId;
    await api().post('/api/webhooks/sms/delivery').type('form')
      .send({ id: providerId, status: 'Failed', failureReason: 'InvalidPhoneNumber' })
      .expect(200);

    const triage = await doctor.auth(api().get('/api/triage')).expect(200);
    expect(triage.body.needs_attention[0].reasons[0]).toMatchObject({
      type: 'unreachable',
      label_en: 'Unreachable',
    });

    // And a confirmed delivery clears it.
    await api().post('/api/webhooks/sms/delivery').type('form')
      .send({ id: providerId, status: 'Success' }).expect(200);
    expect((await doctor.auth(api().get('/api/triage'))).body.needs_attention).toHaveLength(0);
  });

  it('ignores a redelivered webhook instead of double-counting the reply', async () => {
    const doctor = await registerDoctor();
    const patient = await addPatient(doctor);
    const { start } = await addStandardPlan(doctor, patient.id);
    await tick(at(start, '08:01'));

    await reply(patient.phone, '1', 'at-duplicate');
    const second = await reply(patient.phone, '1', 'at-duplicate');
    expect(second.body.status).toBe('duplicate');

    const stored = await query(`select id from inbound_messages where patient_id = $1`, [patient.id]);
    expect(stored).toHaveLength(1);
  });
});

describe('care plan lifecycle', () => {
  it('closes the plan after its tail and stops reminding', async () => {
    const doctor = await registerDoctor();
    const patient = await addPatient(doctor);
    const plan = await addStandardPlan(doctor, patient.id);

    // ends_on is the last visit plus the 7-day tail.
    const afterTail = at(plusDays(plan.ends_on, 1), '09:00');
    const result = await tick(afterTail);
    expect(result.plansClosed).toBe(1);

    const [row] = await query<{ status: string; patient_status: string }>(
      `select cp.status, p.status as patient_status
         from care_plans cp join patients p on p.id = cp.patient_id
        where cp.patient_id = $1`,
      [patient.id],
    );
    expect(row).toMatchObject({ status: 'closed', patient_status: 'archived' });

    const queued = await query(
      `select id from messages where patient_id = $1 and status = 'queued'`,
      [patient.id],
    );
    expect(queued).toHaveLength(0);
  });
});
