import { describe, expect, it } from 'vitest';
import { query } from '../src/db.js';
import { addPatient, addStandardPlan, api, registerDoctor, today } from './helpers.js';

/**
 * "A doctor only sees their own patients" (PRODUCT.md §8). These tests exist so
 * that a future refactor that starts trusting a client-supplied doctor_id fails
 * loudly.
 */
describe('access control', () => {
  it('refuses every patient route without a token', async () => {
    await api().get('/api/patients').expect(401);
    await api().get('/api/triage').expect(401);
    await api().post('/api/patients').send({}).expect(401);
  });

  it('refuses a tampered token', async () => {
    const doctor = await registerDoctor();
    const [id, expiry] = doctor.token.split('.');
    await api()
      .get('/api/patients')
      .set('authorization', `Bearer ${id}.${expiry}.forged-signature`)
      .expect(401);
  });

  it('hides one doctor\'s patients from another', async () => {
    const mine = await registerDoctor({ name: 'Mwakalinga' });
    const theirs = await registerDoctor({ name: 'Kileo' });
    const patient = await addPatient(mine);
    await addStandardPlan(mine, patient.id);

    const list = await theirs.auth(api().get('/api/patients')).expect(200);
    expect(list.body.patients).toHaveLength(0);

    // Knowing the id is not enough.
    await theirs.auth(api().get(`/api/patients/${patient.id}`)).expect(404);
    await theirs
      .auth(api().post(`/api/patients/${patient.id}/care-plans`))
      .send({ medications: [], follow_up_visits: [] })
      .expect(404);

    const triage = await theirs.auth(api().get('/api/triage')).expect(200);
    expect(triage.body.needs_attention).toHaveLength(0);
    expect(triage.body.counts.stable).toBe(0);
  });

  it('records who read a patient record', async () => {
    const doctor = await registerDoctor();
    const patient = await addPatient(doctor);
    await doctor.auth(api().get(`/api/patients/${patient.id}`)).expect(200);

    const trail = await query<{ action: string }>(
      `select action from access_log where doctor_id = $1 and patient_id = $2 order by id`,
      [doctor.id, patient.id],
    );
    expect(trail.map((r) => r.action)).toEqual(['patient.create', 'patient.read']);
  });

  it('will not create a patient without recorded consent', async () => {
    const doctor = await registerDoctor();
    const res = await doctor
      .auth(api().post('/api/patients'))
      .send({
        name: 'Asha Mrisho',
        phone: '0754000111',
        diagnosis: 'Malaria',
        discharge_date: today(),
        consent_sms: false,
        phone_is_personal: true,
      })
      .expect(400);
    expect(JSON.stringify(res.body)).toContain('consent');
  });

  it('never returns a password hash', async () => {
    const doctor = await registerDoctor();
    const me = await doctor.auth(api().get('/api/auth/me')).expect(200);
    expect(JSON.stringify(me.body)).not.toContain('scrypt');
  });

  it('rejects a login with the wrong password, without saying which part was wrong', async () => {
    const doctor = await registerDoctor({ phone: '0755999888' });
    const wrong = await api()
      .post('/api/auth/login')
      .send({ phone: '0755999888', password: 'not the password' })
      .expect(401);
    const unknown = await api()
      .post('/api/auth/login')
      .send({ phone: '0700000000', password: 'not the password' })
      .expect(401);
    expect(wrong.body).toEqual(unknown.body);
    expect(doctor.id).toBeTruthy();
  });
});
