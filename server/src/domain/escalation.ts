import type { PoolClient } from 'pg';
import { config } from '../config.js';
import { one, query } from '../db.js';
import { localDate } from './time.js';

/**
 * A miss is never silently logged (PRODUCT.md §5). This module turns silence and
 * bad news into Alerts on the doctor's dashboard, with thresholds a doctor can
 * override per patient — a post-op patient and someone on a 5-day antibiotic
 * course do not warrant the same trigger. (D6)
 */

export type AlertType =
  | 'missed_meds' | 'red_flag_symptom' | 'missed_visit'
  | 'unreachable' | 'unparsed_reply' | 'opted_out';
export type AlertSeverity = 'critical' | 'warning' | 'info';

/**
 * Alerts are state, not an event stream: one open alert per patient per type,
 * refreshed with the latest context. Five missed doses is one conversation, not
 * five rows fighting for the top of the triage list.
 */
export async function raiseAlert(
  client: PoolClient,
  input: {
    patientId: string;
    type: AlertType;
    severity: AlertSeverity;
    context?: Record<string, unknown>;
  },
): Promise<string | undefined> {
  const row = await one<{ id: string }>(
    `insert into alerts (patient_id, doctor_id, type, severity, context)
     select $1, p.doctor_id, $2, $3, $4 from patients p where p.id = $1
     on conflict (patient_id, type) where resolved = false
     do update set context = excluded.context, severity = excluded.severity
     returning id`,
    [input.patientId, input.type, input.severity, JSON.stringify(input.context ?? {})],
    client,
  );
  return row?.id;
}

export async function resolveAlert(
  client: PoolClient,
  patientId: string,
  type: AlertType,
): Promise<void> {
  await client.query(
    `update alerts set resolved = true, resolved_at = now()
      where patient_id = $1 and type = $2 and resolved = false`,
    [patientId, type],
  );
}

/**
 * A dose counts as missed only if we actually reached the patient. If the SMS
 * never landed, that is a delivery problem — an `unreachable` alert, raised by
 * the worker — and blaming the patient's adherence for it would be a lie in the
 * chart.
 */
export async function markMissedDoses(client: PoolClient, now = new Date()): Promise<string[]> {
  const cutoff = new Date(now.getTime() - config.worker.doseGraceHours * 3_600_000);
  const rows = await query<{ patient_id: string }>(
    `update medication_logs l
        set taken = false, source = 'missed-no-response', logged_at = $1
      where l.taken is null
        and l.scheduled_for < $2
        and exists (
          select 1 from check_ins c
            join messages m on m.check_in_id = c.id
           where c.medication_log_id = l.id
             and m.status in ('sent', 'delivered')
        )
      returning l.patient_id`,
    [now, cutoff],
    client,
  );
  return [...new Set(rows.map((r) => r.patient_id))];
}

export interface AdherenceSnapshot {
  consecutiveMisses: number;
  missesInWindow: number;
  dosesInWindow: number;
  adherenceRate: number | null;
}

export async function adherenceSnapshot(
  client: PoolClient | undefined,
  patientId: string,
  now = new Date(),
): Promise<AdherenceSnapshot> {
  const windowStart = new Date(now.getTime() - config.escalation.windowDays * 86_400_000);

  const recent = await query<{ taken: boolean | null }>(
    `select taken from medication_logs
      where patient_id = $1 and scheduled_for <= $2 and taken is not null
      order by scheduled_for desc limit 20`,
    [patientId, now],
    client,
  );

  let consecutiveMisses = 0;
  for (const row of recent) {
    if (row.taken === false) consecutiveMisses += 1;
    else break;
  }

  const stats = await one<{ misses: number; total: number }>(
    `select count(*) filter (where taken = false) as misses,
            count(*) as total
       from medication_logs
      where patient_id = $1 and scheduled_for between $2 and $3 and taken is not null`,
    [patientId, windowStart, now],
    client,
  );

  const total = stats?.total ?? 0;
  const misses = stats?.misses ?? 0;
  return {
    consecutiveMisses,
    missesInWindow: misses,
    dosesInWindow: total,
    adherenceRate: total > 0 ? (total - misses) / total : null,
  };
}

/** Raise or clear the missed_meds alert for one patient. */
export async function evaluateAdherence(
  client: PoolClient,
  patientId: string,
  now = new Date(),
): Promise<'raised' | 'cleared' | 'unchanged'> {
  const snapshot = await adherenceSnapshot(client, patientId, now);
  const breached =
    snapshot.consecutiveMisses >= config.escalation.consecutiveMisses ||
    snapshot.missesInWindow >= config.escalation.missesInWindow;

  if (breached) {
    await raiseAlert(client, {
      patientId,
      type: 'missed_meds',
      severity: 'warning',
      context: {
        consecutive_misses: snapshot.consecutiveMisses,
        misses_in_window: snapshot.missesInWindow,
        window_days: config.escalation.windowDays,
      },
    });
    return 'raised';
  }

  // Back on track: a doctor should not have to dismiss an alert the patient
  // already answered.
  if (snapshot.consecutiveMisses === 0) {
    const open = await one<{ id: string }>(
      `select id from alerts where patient_id = $1 and type = 'missed_meds' and resolved = false`,
      [patientId],
      client,
    );
    if (open) {
      await resolveAlert(client, patientId, 'missed_meds');
      return 'cleared';
    }
  }
  return 'unchanged';
}

/** A visit date passes with no confirmation: alert the next morning. (D6) */
export async function sweepMissedVisits(client: PoolClient, now = new Date()): Promise<number> {
  const rows = await query<{ patient_id: string; visit_date: string; location: string }>(
    `select p.id as patient_id, v.visit_date, v.location
       from follow_up_visits v
       join care_plans cp on cp.id = v.care_plan_id
       join patients   p  on p.id = cp.patient_id
      where v.attended is null
        and v.confirmed = false
        and v.visit_date < ($1::timestamptz at time zone p.timezone)::date
        and p.status = 'active'`,
    [now],
    client,
  );

  for (const row of rows) {
    await raiseAlert(client, {
      patientId: row.patient_id,
      type: 'missed_visit',
      severity: 'warning',
      context: { visit_date: row.visit_date, location: row.location },
    });
  }
  return rows.length;
}

/** Close plans past their tail, and stop their reminders the same moment. (D3) */
export async function closeExpiredPlans(client: PoolClient, now = new Date()): Promise<string[]> {
  const closed = await query<{ id: string; patient_id: string }>(
    `update care_plans cp
        set status = 'closed', closed_at = $1
       from patients p
      where p.id = cp.patient_id
        and cp.status = 'active'
        and cp.open_ended = false
        and cp.ends_on is not null
        and cp.ends_on < ($1::timestamptz at time zone p.timezone)::date
      returning cp.id, cp.patient_id`,
    [now],
    client,
  );

  for (const plan of closed) {
    // A patient receiving pill reminders for a course they finished last month
    // is how you get ignored.
    await client.query(
      `delete from messages
        where patient_id = $1 and status = 'queued' and scheduled_for > $2`,
      [plan.patient_id, now],
    );

    const stillActive = await one<{ id: string }>(
      `select id from care_plans where patient_id = $1 and status = 'active' limit 1`,
      [plan.patient_id],
      client,
    );
    if (!stillActive) {
      await client.query(`update patients set status = 'archived' where id = $1`, [
        plan.patient_id,
      ]);
    }
  }
  return closed.map((p) => p.id);
}

export function todayIn(timezone: string, now = new Date()): string {
  return localDate(now, timezone);
}
