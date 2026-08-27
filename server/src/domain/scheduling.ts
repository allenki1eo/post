import type { PoolClient } from 'pg';
import { config } from '../config.js';
import { one, query } from '../db.js';
import { addDays, applyQuietHours, eachDate, localDate, localInstant } from './time.js';
import { medicationSms, visitSms, type Locale } from './sms-templates.js';

/**
 * Expands an active care plan into concrete dose logs and queued messages for a
 * rolling horizon. Idempotent: re-running it adds only what is missing, so it is
 * safe to call on plan creation, on plan edit, and on every worker tick. That is
 * what makes open-ended (chronic) plans work without expanding forever. (D3)
 */

const DEFAULT_HORIZON_DAYS = 14;
const VISIT_REMINDER_LOCAL_TIME = '08:00';

interface PlanRow {
  id: string;
  patient_id: string;
  status: string;
  open_ended: boolean;
  starts_on: string;
  patient_name: string;
  phone: string;
  timezone: string;
  language: Locale;
  has_app: boolean;
  preferred_channel: 'app' | 'sms';
  opted_out: boolean;
  patient_status: string;
  doctor_name: string;
}

export interface ExpansionResult {
  doses: number;
  visitReminders: number;
  endsOn: string | null;
}

/**
 * v1 sends over SMS even to patients who have the app: FCM is wired but a push
 * that silently fails is worse than an SMS that costs a shilling. Once delivery
 * receipts for push are trusted, this becomes `has_app && push_token_fresh`.
 */
function channelFor(plan: PlanRow): 'sms' | 'push' {
  return plan.has_app && plan.preferred_channel === 'app' && process.env.FCM_SERVER_KEY
    ? 'push'
    : 'sms';
}

export async function expandPlanWindow(
  client: PoolClient,
  planId: string,
  opts: { now?: Date; horizonDays?: number } = {},
): Promise<ExpansionResult> {
  const now = opts.now ?? new Date();
  const horizonDays = opts.horizonDays ?? DEFAULT_HORIZON_DAYS;

  const plan = await one<PlanRow>(
    `select cp.id, cp.patient_id, cp.status, cp.open_ended, cp.starts_on,
            p.name as patient_name, p.phone, p.timezone, p.language, p.has_app,
            p.preferred_channel, p.opted_out, p.status as patient_status,
            d.name as doctor_name
       from care_plans cp
       join patients p on p.id = cp.patient_id
       join doctors  d on d.id = p.doctor_id
      where cp.id = $1`,
    [planId],
    client,
  );

  if (!plan) throw new Error(`care plan ${planId} not found`);
  if (plan.status !== 'active' || plan.patient_status !== 'active' || plan.opted_out) {
    return { doses: 0, visitReminders: 0, endsOn: null };
  }

  const today = localDate(now, plan.timezone);
  const horizonEnd = addDays(today, horizonDays);
  const channel = channelFor(plan);

  let doses = 0;
  let visitReminders = 0;

  // ------------------------------------------------------------ medications
  const meds = await query<{
    id: string; name: string; dosage: string; times: string[];
    start_date: string; end_date: string;
  }>(
    `select id, name, dosage, times, start_date, end_date
       from medications where care_plan_id = $1 order by created_at`,
    [planId],
    client,
  );

  for (const med of meds) {
    const from = med.start_date > today ? med.start_date : today;
    const to = med.end_date < horizonEnd ? med.end_date : horizonEnd;
    if (from > to) continue;

    for (const date of eachDate(from, to)) {
      for (const time of med.times) {
        const scheduledFor = localInstant(date, time, plan.timezone);
        if (scheduledFor.getTime() <= now.getTime()) continue; // never backfill a past dose

        const log = await one<{ id: string }>(
          `insert into medication_logs (patient_id, medication_id, scheduled_for, local_date)
           values ($1, $2, $3, $4)
           on conflict (medication_id, scheduled_for) do nothing
           returning id`,
          [plan.patient_id, med.id, scheduledFor, date],
          client,
        );
        if (!log) continue; // already expanded

        const checkIn = await one<{ id: string }>(
          `insert into check_ins (patient_id, medication_log_id, kind)
           values ($1, $2, 'adherence') returning id`,
          [plan.patient_id, log.id],
          client,
        );

        const { sendAt } = applyQuietHours(scheduledFor, plan.timezone);
        const body = medicationSms({
          doctorName: plan.doctor_name,
          medication: med.name,
          dosage: med.dosage,
          time,
          locale: plan.language,
        });

        await client.query(
          `insert into messages
             (patient_id, check_in_id, kind, channel, to_phone, body, locale, scheduled_for)
           values ($1, $2, 'medication', $3, $4, $5, $6, $7)`,
          [plan.patient_id, checkIn!.id, channel, plan.phone, body, plan.language, sendAt],
        );
        doses += 1;
      }
    }
  }

  // ----------------------------------------------------------------- visits
  const visits = await query<{
    id: string; visit_date: string; location: string; reminder_lead_days: number[];
  }>(
    `select id, visit_date, location, reminder_lead_days
       from follow_up_visits where care_plan_id = $1 order by visit_date`,
    [planId],
    client,
  );

  for (const visit of visits) {
    for (const lead of visit.reminder_lead_days) {
      const sendDate = addDays(visit.visit_date, -lead);
      if (sendDate < today || sendDate > horizonEnd) continue;

      const at = localInstant(sendDate, VISIT_REMINDER_LOCAL_TIME, plan.timezone);
      if (at.getTime() <= now.getTime()) continue;

      const { sendAt } = applyQuietHours(at, plan.timezone);
      const body = visitSms({
        doctorName: plan.doctor_name,
        visitDate: formatVisitDate(visit.visit_date),
        location: visit.location,
        daysAhead: lead,
        locale: plan.language,
      });

      const inserted = await one<{ id: string }>(
        `insert into messages
           (patient_id, follow_up_visit_id, kind, channel, to_phone, body, locale, scheduled_for)
         values ($1, $2, 'visit', $3, $4, $5, $6, $7)
         on conflict (follow_up_visit_id, scheduled_for) where follow_up_visit_id is not null
         do nothing
         returning id`,
        [plan.patient_id, visit.id, channel, plan.phone, body, plan.language, sendAt],
        client,
      );
      if (inserted) visitReminders += 1;
    }
  }

  const endsOn = await refreshPlanEndDate(client, planId);
  return { doses, visitReminders, endsOn };
}

function formatVisitDate(date: string): string {
  const [, m, d] = date.split('-');
  return `${d}/${m}`;
}

/**
 * A plan runs until the last dose or visit, plus a tail that catches the
 * check-in after the final dose and the patient who missed the last visit. (D3)
 */
export async function refreshPlanEndDate(
  client: PoolClient,
  planId: string,
): Promise<string | null> {
  const row = await one<{ open_ended: boolean; last_day: string | null }>(
    `select cp.open_ended,
            greatest(
              (select max(end_date)   from medications      where care_plan_id = cp.id),
              (select max(visit_date) from follow_up_visits where care_plan_id = cp.id)
            ) as last_day
       from care_plans cp where cp.id = $1`,
    [planId],
    client,
  );
  if (!row) return null;

  if (row.open_ended) {
    const reviewDue = addDays(localDate(new Date(), 'UTC'), config.openEndedReviewDays);
    await client.query(
      `update care_plans set ends_on = null, review_due_on = $2 where id = $1`,
      [planId, reviewDue],
    );
    return null;
  }

  const endsOn = row.last_day ? addDays(row.last_day, config.planTailDays) : null;
  await client.query(`update care_plans set ends_on = $2, review_due_on = null where id = $1`, [
    planId,
    endsOn,
  ]);
  return endsOn;
}

/** Re-expand every active plan. Called each worker tick. */
export async function expandAllActivePlans(client: PoolClient, now = new Date()): Promise<number> {
  const plans = await query<{ id: string }>(
    `select cp.id from care_plans cp
       join patients p on p.id = cp.patient_id
      where cp.status = 'active' and p.status = 'active' and p.opted_out = false`,
    [],
    client,
  );
  let total = 0;
  for (const plan of plans) {
    const result = await expandPlanWindow(client, plan.id, { now });
    total += result.doses + result.visitReminders;
  }
  return total;
}
