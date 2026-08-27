/**
 * Seeds a demonstrable slice: one doctor, five patients, and three days of
 * simulated reminders, replies and silence — so the triage dashboard has
 * something real to show. Safe to re-run; it wipes its own data first.
 *
 *   npm run demo && POST_DEMO=1 npm run dev   →   http://localhost:3000
 */
import { DateTime } from 'luxon';
import { hashPassword } from './api/auth.js';
import { closePool, one, query, tx } from './db.js';
import { handleDeliveryReport, handleInboundSms } from './domain/inbound.js';
import { expandPlanWindow } from './domain/scheduling.js';
import { migrate } from './migrate.js';
import { FakeSmsGateway, setSmsGateway } from './sms/index.js';
import { tick } from './worker.js';

const TZ = 'Africa/Dar_es_Salaam';
const DOCTOR_PHONE = '+255700000001';
const DOCTOR_PASSWORD = 'post-demo-1234';

const gateway = new FakeSmsGateway();
setSmsGateway(gateway);

const local = (daysFromToday: number, time: string) =>
  DateTime.now().setZone(TZ).plus({ days: daysFromToday })
    .set({ hour: Number(time.slice(0, 2)), minute: Number(time.slice(3, 5)), second: 0, millisecond: 0 })
    .toJSDate();

const isoDate = (daysFromToday: number) =>
  DateTime.now().setZone(TZ).plus({ days: daysFromToday }).toISODate()!;

async function patient(doctorId: string, name: string, phone: string, diagnosis: string) {
  const row = await one<{ id: string; phone: string }>(
    `insert into patients
       (doctor_id, name, phone, diagnosis, treatment_summary, discharge_date,
        language, timezone, consent_sms, phone_is_personal)
     values ($1,$2,$3,$4,$5,$6,'sw',$7,true,true)
     returning id, phone`,
    [doctorId, name, phone, diagnosis, 'Alitibiwa na kuruhusiwa', isoDate(-2), TZ],
  );
  return row!;
}

async function carePlan(
  doctorId: string,
  patientId: string,
  opts: { medication: string; dosage: string; times: string[]; visitInDays?: number },
) {
  return tx(async (client) => {
    const plan = await one<{ id: string }>(
      `insert into care_plans (patient_id, created_by, red_flag_symptoms, starts_on)
       values ($1,$2,$3,$4) returning id`,
      [patientId, doctorId, ['Kupumua kwa shida', 'Homa kali', 'Kutokwa damu'], isoDate(-2)],
      client,
    );
    await client.query(
      `insert into medications (care_plan_id, name, dosage, times, start_date, end_date)
       values ($1,$2,$3,$4,$5,$6)`,
      [plan!.id, opts.medication, opts.dosage, opts.times, isoDate(-2), isoDate(3)],
    );
    if (opts.visitInDays !== undefined) {
      await client.query(
        `insert into follow_up_visits (care_plan_id, visit_date, location)
         values ($1,$2,$3)`,
        [plan!.id, isoDate(opts.visitInDays), 'Kliniki ya Sinza, Dar es Salaam'],
      );
    }
    // Expand from before the first dose so the simulated history exists.
    await expandPlanWindow(client, plan!.id, { now: local(-2, '00:01') });
    return plan!.id;
  });
}

const say = (phone: string, text: string, at: Date, id: string) =>
  tx((client) => handleInboundSms(client, { from: phone, text, receivedAt: at, providerMessageId: id }));

async function main() {
  await migrate(() => {});

  await query(`truncate doctors, patients, care_plans, medications, follow_up_visits,
               medication_logs, check_ins, messages, inbound_messages, alerts, access_log
               restart identity cascade`);

  const doctor = await one<{ id: string }>(
    `insert into doctors (name, phone, password_hash, specialty, facility)
     values ($1,$2,$3,$4,$5) returning id`,
    ['Mwakalinga', DOCTOR_PHONE, await hashPassword(DOCTOR_PASSWORD),
     'Internal medicine', 'Muhimbili National Hospital'],
  );
  const doctorId = doctor!.id;

  const neema  = await patient(doctorId, 'Neema Paul',    '+255754000101', 'Post-operative: appendectomy');
  const asha   = await patient(doctorId, 'Asha Mrisho',   '+255754000102', 'Community-acquired pneumonia');
  const juma   = await patient(doctorId, 'Juma Said',     '+255754000103', 'Pulmonary TB, intensive phase');
  const fatuma = await patient(doctorId, 'Fatuma Hassan', '+255754000104', 'Type 2 diabetes, new insulin');
  const baraka = await patient(doctorId, 'Baraka Msofe',  '+255754000105', 'Malaria, severe');

  await carePlan(doctorId, neema.id,  { medication: 'Tramadol', dosage: 'kidonge 1', times: ['08:00', '20:00'], visitInDays: 5 });
  await carePlan(doctorId, asha.id,   { medication: 'Amoxicillin', dosage: 'vidonge 2', times: ['08:00', '20:00'], visitInDays: 2 });
  await carePlan(doctorId, juma.id,   { medication: 'Rifampicin', dosage: 'vidonge 3', times: ['07:00'], visitInDays: 6 });
  await carePlan(doctorId, fatuma.id, { medication: 'Metformin', dosage: 'kidonge 1', times: ['08:00', '20:00'], visitInDays: 1 });
  await carePlan(doctorId, baraka.id, { medication: 'Artemether-Lumefantrine', dosage: 'vidonge 4', times: ['08:00', '20:00'], visitInDays: 4 });

  // ---- two days of reminders, replies and silence -------------------------
  for (const day of [-2, -1]) {
    for (const time of ['07:01', '08:01', '20:01']) {
      const now = local(day, time);
      await tick(now);

      // Fatuma takes everything on time.
      await say(fatuma.phone, '1', new Date(now.getTime() + 6 * 60_000), `demo-f-${day}-${time}`);
      // Neema keeps up until the pain starts.
      if (!(day === -1 && time === '20:01')) {
        await say(neema.phone, 'ndiyo', new Date(now.getTime() + 9 * 60_000), `demo-n-${day}-${time}`);
      }
      // Asha answers the mornings only.
      if (time === '08:01') {
        await say(asha.phone, '1', new Date(now.getTime() + 12 * 60_000), `demo-a-${day}-${time}`);
      }
      // Juma answers nothing at all.
    }
    // Grace period expires: the unanswered doses become misses.
    await tick(local(day, '23:50'));
  }

  const now = new Date();

  // Neema reports a red flag.
  await say(neema.phone, '3', new Date(now.getTime() - 40 * 60_000), 'demo-red-flag');
  // Asha writes in her own words.
  await say(asha.phone, 'nina maumivu ya kifua tangu jana usiku na siwezi kulala',
            new Date(now.getTime() - 25 * 60_000), 'demo-free-text');
  // Baraka's number stopped accepting messages.
  const barakaMessage = await one<{ provider_message_id: string }>(
    `select provider_message_id from messages
      where patient_id = $1 and provider_message_id is not null
      order by sent_at desc limit 1`,
    [baraka.id],
  );
  if (barakaMessage?.provider_message_id) {
    await tx((client) =>
      handleDeliveryReport(client, {
        providerMessageId: barakaMessage.provider_message_id,
        status: 'Failed',
        failureReason: 'InvalidPhoneNumber',
      }),
    );
  }

  const result = await tick(now);

  const alerts = await query<{ name: string; type: string; severity: string }>(
    `select p.name, a.type, a.severity from alerts a join patients p on p.id = a.patient_id
      where a.resolved = false
      order by case a.severity when 'critical' then 0 when 'warning' then 1 else 2 end, p.name`,
  );

  console.log(`\nSeeded ${gateway.outbox.length} simulated SMS across 5 patients.`);
  console.log(`Last tick: ${JSON.stringify(result)}\n`);
  console.log('Open alerts:');
  for (const a of alerts) console.log(`  ${a.severity.padEnd(8)} ${a.type.padEnd(17)} ${a.name}`);
  console.log(`\nSign in at http://localhost:3000  —  ${DOCTOR_PHONE} / ${DOCTOR_PASSWORD}`);
  console.log('Start it with:  POST_DEMO=1 npm run dev\n');

  await closePool();
}

await main();
