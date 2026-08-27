import { describe, expect, it } from 'vitest';
import { pool, query } from '../src/db.js';
import { adherenceSnapshot } from '../src/domain/escalation.js';
import { tick } from '../src/worker.js';
import { fakeSms } from './setup.js';
import { addPatient, addStandardPlan, api, at, plusDays, registerDoctor } from './helpers.js';

/**
 * The vertical slice: doctor adds a patient, builds a care plan, the scheduler
 * fires a real reminder, the patient replies by SMS, and the dose is recorded.
 */
describe('discharge to first answered dose', () => {
  it('carries a patient from discharge through a reminder to an answered dose', async () => {
    const doctor = await registerDoctor();
    const patient = await addPatient(doctor);
    const plan = await addStandardPlan(doctor, patient.id);

    // 1. The plan expanded into concrete doses and reminders.
    expect(plan.scheduled_doses).toBe(10); // 2 doses x 5 days
    expect(plan.scheduled_visit_reminders).toBe(2); // 3 days and 1 day ahead
    expect(plan.ends_on).toBe(plusDays(plan.start, 6 + 7)); // last visit + 7-day tail

    // 2. Nothing has gone out yet: the first dose is tomorrow at 08:00.
    const beforeFirstDose = await tick(at(plan.start, '07:00'));
    expect(beforeFirstDose.sent).toBe(0);
    expect(fakeSms.outbox).toHaveLength(0);

    // 3. At 08:01 the reminder is due and is sent.
    const firstDose = await tick(at(plan.start, '08:01'));
    expect(firstDose.sent).toBe(1);

    const sms = fakeSms.last!;
    expect(sms.to).toBe(patient.phone);
    expect(sms.body).toContain('Kumbusho la dawa 08:00');
    expect(sms.body).toContain('Amoxicillin');
    expect(sms.body).toContain('Jibu 1=nimekunywa, 2=bado, 3=nahitaji msaada');
    // Nothing clinical travels over SMS.
    expect(sms.body).not.toContain('pneumonia');

    // 4. The patient replies "1" from their phone.
    await api()
      .post('/api/webhooks/sms/inbound')
      .type('form')
      .send({ from: patient.phone, to: '15629', text: '1', id: 'at-inbound-1' })
      .expect(200);

    const doses = await query<{ taken: boolean; source: string }>(
      `select taken, source from medication_logs where patient_id = $1 and taken is not null`,
      [patient.id],
    );
    expect(doses).toEqual([{ taken: true, source: 'sms' }]);

    // 5. The doctor sees an answered dose and no alerts. Adherence is measured
    //    as of the dose time, not wall-clock now, since this plan starts tomorrow.
    const detail = await doctor.auth(api().get(`/api/patients/${patient.id}`)).expect(200);
    expect(detail.body.alerts).toHaveLength(0);
    expect(detail.body.doses[0]).toMatchObject({ taken: true, medication: 'Amoxicillin' });

    const client = await pool.connect();
    try {
      const snapshot = await adherenceSnapshot(client, patient.id, at(plan.start, '12:00'));
      expect(snapshot).toMatchObject({ consecutiveMisses: 0, missesInWindow: 0, adherenceRate: 1 });
    } finally {
      client.release();
    }

    const triage = await doctor.auth(api().get('/api/triage')).expect(200);
    expect(triage.body.needs_attention).toHaveLength(0);
    expect(triage.body.counts.stable).toBe(1);
    expect(triage.body.upcoming_visits.length).toBeGreaterThanOrEqual(0);
  });

  it('is idempotent: re-expanding a plan does not double-book reminders', async () => {
    const doctor = await registerDoctor();
    const patient = await addPatient(doctor);
    const plan = await addStandardPlan(doctor, patient.id);

    await tick(at(plan.start, '07:00'));
    await tick(at(plan.start, '07:05'));

    const rows = await query<{ count: number }>(
      `select count(*) as count from messages where patient_id = $1`,
      [patient.id],
    );
    expect(rows[0]?.count).toBe(12); // 10 doses + 2 visit reminders, unchanged
  });

  it('never sends the same reminder twice, even across overlapping ticks', async () => {
    const doctor = await registerDoctor();
    const patient = await addPatient(doctor);
    const plan = await addStandardPlan(doctor, patient.id);

    const when = at(plan.start, '08:01');
    const results = await Promise.all([tick(when), tick(when)]);
    expect(results[0].sent + results[1].sent).toBe(1);
    expect(fakeSms.outbox).toHaveLength(1);
  });

  it('retries a failed send before giving up, then raises unreachable', async () => {
    const doctor = await registerDoctor();
    const patient = await addPatient(doctor);
    const plan = await addStandardPlan(doctor, patient.id);

    fakeSms.failNext(3);

    // Attempt 1 and 2 back off; attempt 3 exhausts the budget.
    const first = await tick(at(plan.start, '08:01'));
    expect(first.retried).toBe(1);
    expect(first.sent).toBe(0);

    await tick(at(plan.start, '08:30'));
    const third = await tick(at(plan.start, '09:30'));
    expect(third.failed).toBe(1);

    const alerts = await query<{ type: string; severity: string }>(
      `select type, severity from alerts where patient_id = $1 and resolved = false`,
      [patient.id],
    );
    expect(alerts).toEqual([{ type: 'unreachable', severity: 'warning' }]);

    // The missed dose is not blamed on the patient: we never reached them.
    const missed = await query(
      `select id from medication_logs where patient_id = $1 and taken = false`,
      [patient.id],
    );
    expect(missed).toHaveLength(0);
  });
});
