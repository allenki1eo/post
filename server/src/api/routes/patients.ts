import { Router } from 'express';
import { z } from 'zod';
import { one, query, tx } from '../../db.js';
import { adherenceSnapshot } from '../../domain/escalation.js';
import { normalisePhone } from '../../domain/sms-grammar.js';
import { expandPlanWindow } from '../../domain/scheduling.js';
import { requireDoctor } from '../auth.js';

export const patientsRouter = Router();
patientsRouter.use(requireDoctor);

const createPatientSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(7),
  diagnosis: z.string().min(2),
  treatment_summary: z.string().optional(),
  discharge_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  has_app: z.boolean().optional(),
  preferred_channel: z.enum(['app', 'sms']).optional(),
  language: z.enum(['sw', 'en']).optional(),
  timezone: z.string().optional(),
  // Consent is not a formality: it is the basis for every message POST sends,
  // and shared phones change how much a message may say. (D9)
  consent_sms: z.literal(true, {
    errorMap: () => ({ message: 'patient consent to SMS follow-up is required' }),
  }),
  phone_is_personal: z.boolean(),
});

patientsRouter.post('/', async (req, res) => {
  const parsed = createPatientSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid body', details: parsed.error.flatten() });
    return;
  }
  const body = parsed.data;
  const phone = normalisePhone(body.phone);

  const duplicate = await one(
    'select id from patients where doctor_id = $1 and phone = $2',
    [req.doctorId, phone],
  );
  if (duplicate) {
    res.status(409).json({ error: 'you already have a patient with that number' });
    return;
  }

  const patient = await one(
    `insert into patients
       (doctor_id, name, phone, diagnosis, treatment_summary, discharge_date,
        has_app, preferred_channel, language, timezone, consent_sms, phone_is_personal)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     returning id, name, phone, diagnosis, discharge_date, language, preferred_channel, status`,
    [
      req.doctorId, body.name, phone, body.diagnosis, body.treatment_summary ?? null,
      body.discharge_date, body.has_app ?? false, body.preferred_channel ?? 'sms',
      body.language ?? 'sw', body.timezone ?? 'Africa/Dar_es_Salaam',
      body.consent_sms, body.phone_is_personal,
    ],
  );

  await query('insert into access_log (doctor_id, patient_id, action) values ($1,$2,$3)', [
    req.doctorId, patient!.id, 'patient.create',
  ]);
  res.status(201).json({ patient });
});

patientsRouter.get('/', async (req, res) => {
  const patients = await query(
    `select p.id, p.name, p.phone, p.diagnosis, p.discharge_date, p.status, p.language,
            (select count(*) from alerts a where a.patient_id = p.id and a.resolved = false)
              as open_alerts
       from patients p
      where p.doctor_id = $1
      order by p.status, p.created_at desc`,
    [req.doctorId],
  );
  res.json({ patients });
});

patientsRouter.get('/:id', async (req, res) => {
  const patient = await one<{ id: string; timezone: string }>(
    `select id, name, phone, diagnosis, treatment_summary, discharge_date, status,
            language, preferred_channel, has_app, timezone, opted_out, consent_sms,
            phone_is_personal, created_at
       from patients where id = $1 and doctor_id = $2`,
    [req.params.id, req.doctorId],
  );
  if (!patient) {
    res.status(404).json({ error: 'patient not found' });
    return;
  }

  const [plans, doses, alerts, checkIns, adherence] = await Promise.all([
    query(
      `select cp.id, cp.status, cp.starts_on, cp.ends_on, cp.open_ended, cp.red_flag_symptoms,
              coalesce((select json_agg(json_build_object(
                 'id', m.id, 'name', m.name, 'dosage', m.dosage, 'times', m.times,
                 'start_date', m.start_date, 'end_date', m.end_date) order by m.created_at)
                from medications m where m.care_plan_id = cp.id), '[]') as medications,
              coalesce((select json_agg(json_build_object(
                 'id', v.id, 'visit_date', v.visit_date, 'location', v.location,
                 'confirmed', v.confirmed, 'attended', v.attended) order by v.visit_date)
                from follow_up_visits v where v.care_plan_id = cp.id), '[]') as visits
         from care_plans cp where cp.patient_id = $1 order by cp.created_at desc`,
      [req.params.id],
    ),
    query(
      `select l.id, l.scheduled_for, l.local_date, l.taken, l.source, m.name as medication
         from medication_logs l join medications m on m.id = l.medication_id
        where l.patient_id = $1 and l.scheduled_for < now() + interval '1 day'
        order by l.scheduled_for desc limit 60`,
      [req.params.id],
    ),
    query(
      `select id, type, severity, context, created_at, resolved
         from alerts where patient_id = $1 order by resolved, created_at desc limit 20`,
      [req.params.id],
    ),
    query(
      `select id, kind, sent_at, responded_at, response_code, response_raw, flagged
         from check_ins where patient_id = $1 and sent_at is not null
        order by sent_at desc limit 20`,
      [req.params.id],
    ),
    adherenceSnapshot(undefined, req.params.id!),
  ]);

  await query('insert into access_log (doctor_id, patient_id, action) values ($1,$2,$3)', [
    req.doctorId, req.params.id, 'patient.read',
  ]);

  res.json({ patient, plans, doses, alerts, check_ins: checkIns, adherence });
});

const carePlanSchema = z.object({
  starts_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  open_ended: z.boolean().optional(),
  red_flag_symptoms: z.array(z.string()).default([]),
  medications: z.array(
    z.object({
      name: z.string().min(1),
      dosage: z.string().min(1),
      times: z.array(z.string().regex(/^\d{2}:\d{2}$/)).min(1),
      start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }),
  ).default([]),
  follow_up_visits: z.array(
    z.object({
      visit_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      // Required: "come in on the 14th" with no place is not a reminder. (D4)
      location: z.string().min(2),
      notes: z.string().optional(),
      reminder_lead_days: z.array(z.number().int().min(0).max(30)).optional(),
    }),
  ).default([]),
});

patientsRouter.post('/:id/care-plans', async (req, res) => {
  const parsed = carePlanSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid body', details: parsed.error.flatten() });
    return;
  }
  const patient = await one<{ id: string; opted_out: boolean }>(
    'select id, opted_out from patients where id = $1 and doctor_id = $2',
    [req.params.id, req.doctorId],
  );
  if (!patient) {
    res.status(404).json({ error: 'patient not found' });
    return;
  }
  if (patient.opted_out) {
    res.status(409).json({ error: 'patient has opted out of messages' });
    return;
  }
  const body = parsed.data;
  if (body.medications.length === 0 && body.follow_up_visits.length === 0) {
    res.status(400).json({ error: 'a care plan needs at least one medication or visit' });
    return;
  }

  const result = await tx(async (client) => {
    const plan = await one<{ id: string }>(
      `insert into care_plans (patient_id, created_by, open_ended, red_flag_symptoms, starts_on)
       values ($1,$2,$3,$4,coalesce($5::date, current_date)) returning id`,
      [
        patient.id, req.doctorId, body.open_ended ?? false,
        body.red_flag_symptoms, body.starts_on ?? null,
      ],
      client,
    );

    for (const med of body.medications) {
      await client.query(
        `insert into medications (care_plan_id, name, dosage, times, start_date, end_date)
         values ($1,$2,$3,$4,$5,$6)`,
        [plan!.id, med.name, med.dosage, med.times, med.start_date, med.end_date],
      );
    }
    for (const visit of body.follow_up_visits) {
      await client.query(
        `insert into follow_up_visits
           (care_plan_id, visit_date, location, notes, reminder_lead_days)
         values ($1,$2,$3,$4,coalesce($5::int[], '{3,1}'))`,
        [plan!.id, visit.visit_date, visit.location, visit.notes ?? null,
         visit.reminder_lead_days ?? null],
      );
    }

    // Patients re-enter triage when a new plan opens.
    await client.query(`update patients set status = 'active' where id = $1`, [patient.id]);

    const expansion = await expandPlanWindow(client, plan!.id);
    return { planId: plan!.id, ...expansion };
  });

  await query('insert into access_log (doctor_id, patient_id, action) values ($1,$2,$3)', [
    req.doctorId, patient.id, 'care_plan.create',
  ]);

  res.status(201).json({
    care_plan_id: result.planId,
    scheduled_doses: result.doses,
    scheduled_visit_reminders: result.visitReminders,
    ends_on: result.endsOn,
  });
});
