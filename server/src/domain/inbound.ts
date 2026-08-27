import type { PoolClient } from 'pg';
import { one, query } from '../db.js';
import { evaluateAdherence, raiseAlert, resolveAlert } from './escalation.js';
import { normalisePhone, parseReply } from './sms-grammar.js';

/**
 * Inbound SMS from a patient. Every path here ends with the message stored —
 * parsed or not. (D2)
 */

export interface InboundSms {
  from: string;
  text: string;
  providerMessageId?: string;
  receivedAt?: Date;
}

export type InboundOutcome =
  | { status: 'duplicate' }
  | { status: 'unknown_sender' }
  | { status: 'opted_out' }
  | { status: 'recorded'; code: '1' | '2' | '3'; checkInId?: string }
  | { status: 'unparsed' };

export async function handleInboundSms(
  client: PoolClient,
  input: InboundSms,
): Promise<InboundOutcome> {
  const receivedAt = input.receivedAt ?? new Date();
  const phone = normalisePhone(input.from);

  // Providers redeliver on timeout. Same provider id, same reply, once. (D8)
  if (input.providerMessageId) {
    const seen = await one<{ id: string }>(
      `select id from inbound_messages where provider_message_id = $1`,
      [input.providerMessageId],
      client,
    );
    if (seen) return { status: 'duplicate' };
  }

  const patient = await one<{ id: string; doctor_id: string; timezone: string }>(
    `select id, doctor_id, timezone from patients
      where phone = $1 order by (status = 'active') desc, created_at desc limit 1`,
    [phone],
    client,
  );

  const parsed = parseReply(input.text);

  // An SMS from a number we do not know still gets stored — a patient may reply
  // from a second SIM, and the doctor can match it by hand.
  if (!patient) {
    await client.query(
      `insert into inbound_messages (from_phone, body, received_at, provider_message_id)
       values ($1, $2, $3, $4)`,
      [phone, input.text, receivedAt, input.providerMessageId ?? null],
    );
    return { status: 'unknown_sender' };
  }

  if (parsed.kind === 'stop') {
    await client.query(
      `update patients set opted_out = true, opted_out_at = $2 where id = $1`,
      [patient.id, receivedAt],
    );
    await client.query(
      `delete from messages where patient_id = $1 and status = 'queued'`,
      [patient.id],
    );
    await recordInbound(client, patient.id, null, phone, input, receivedAt, 'STOP');
    await raiseAlert(client, {
      patientId: patient.id,
      type: 'opted_out',
      severity: 'warning',
      context: { at: receivedAt.toISOString() },
    });
    return { status: 'opted_out' };
  }

  // The reply belongs to the most recent question we actually asked.
  const checkIn = await one<{ id: string; medication_log_id: string | null; kind: string }>(
    `select c.id, c.medication_log_id, c.kind
       from check_ins c
      where c.patient_id = $1 and c.sent_at is not null and c.responded_at is null
      order by c.sent_at desc limit 1`,
    [patient.id],
    client,
  );

  if (parsed.kind === 'unparsed') {
    await recordInbound(client, patient.id, checkIn?.id ?? null, phone, input, receivedAt, null);
    // Free text is not noise. It is a patient telling their doctor something in
    // their own words, and it goes to the top of the dashboard as unread.
    await raiseAlert(client, {
      patientId: patient.id,
      type: 'unparsed_reply',
      severity: 'warning',
      context: { text: input.text.slice(0, 300), received_at: receivedAt.toISOString() },
    });
    return { status: 'unparsed' };
  }

  const code = parsed.code;
  await recordInbound(client, patient.id, checkIn?.id ?? null, phone, input, receivedAt, code);

  if (checkIn) {
    await client.query(
      `update check_ins set responded_at = $2, response_code = $3, response_raw = $4,
              flagged = $5
        where id = $1`,
      [checkIn.id, receivedAt, code, input.text, code === '3'],
    );

    if (checkIn.medication_log_id) {
      if (code === '1') {
        await client.query(
          `update medication_logs set taken = true, logged_at = $2, source = 'sms' where id = $1`,
          [checkIn.medication_log_id, receivedAt],
        );
      } else if (code === '2') {
        // "not yet" is not "no". Leave the dose open so the grace period can
        // still resolve it, and nudge once.
        await queueNudge(client, patient.id, checkIn.id, receivedAt);
      }
    }
  }

  if (code === '3') {
    // Need help. This is the alert that must never wait for a threshold.
    await raiseAlert(client, {
      patientId: patient.id,
      type: 'red_flag_symptom',
      severity: 'critical',
      context: { text: input.text.slice(0, 300), received_at: receivedAt.toISOString() },
    });
  }

  if (code === '1') {
    await evaluateAdherence(client, patient.id, receivedAt);
    await resolveAlert(client, patient.id, 'unreachable');
  }

  return { status: 'recorded', code, checkInId: checkIn?.id };
}

async function recordInbound(
  client: PoolClient,
  patientId: string | null,
  checkInId: string | null,
  phone: string,
  input: InboundSms,
  receivedAt: Date,
  parsedCode: string | null,
) {
  await client.query(
    `insert into inbound_messages
       (from_phone, body, received_at, provider_message_id, patient_id, check_in_id, parsed_code)
     values ($1, $2, $3, $4, $5, $6, $7)
     on conflict (provider_message_id) do nothing`,
    [phone, input.text, receivedAt, input.providerMessageId ?? null, patientId, checkInId, parsedCode],
  );
}

const NUDGE_DELAY_MINUTES = 60;

/** One follow-up nudge per check-in. Two would be nagging. */
async function queueNudge(
  client: PoolClient,
  patientId: string,
  checkInId: string,
  now: Date,
) {
  const existing = await one<{ id: string }>(
    `select id from messages where check_in_id = $1 and kind = 'checkin_followup'`,
    [checkInId],
    client,
  );
  if (existing) return;

  const source = await one<{
    to_phone: string; body: string; locale: string; channel: string;
  }>(
    `select to_phone, body, locale, channel from messages
      where check_in_id = $1 and kind = 'medication' order by created_at limit 1`,
    [checkInId],
    client,
  );
  if (!source) return;

  const { applyQuietHours } = await import('./time.js');
  const patient = await one<{ timezone: string }>(
    `select timezone from patients where id = $1`,
    [patientId],
    client,
  );
  const at = new Date(now.getTime() + NUDGE_DELAY_MINUTES * 60_000);
  const { sendAt } = applyQuietHours(at, patient?.timezone ?? 'Africa/Dar_es_Salaam');

  await client.query(
    `insert into messages
       (patient_id, check_in_id, kind, channel, to_phone, body, locale, scheduled_for)
     values ($1, $2, 'checkin_followup', $3, $4, $5, $6, $7)`,
    [patientId, checkInId, source.channel, source.to_phone, source.body, source.locale, sendAt],
  );
}

/** Delivery report from the provider. (D8) */
export async function handleDeliveryReport(
  client: PoolClient,
  report: { providerMessageId: string; status: string; failureReason?: string },
): Promise<'delivered' | 'failed' | 'ignored'> {
  const status = report.status.toLowerCase();
  const message = await one<{ id: string; patient_id: string }>(
    `select id, patient_id from messages where provider_message_id = $1`,
    [report.providerMessageId],
    client,
  );
  if (!message) return 'ignored';

  if (status === 'success' || status === 'delivered') {
    await client.query(
      `update messages set status = 'delivered', delivered_at = now() where id = $1`,
      [message.id],
    );
    await resolveAlert(client, message.patient_id, 'unreachable');
    return 'delivered';
  }

  if (status === 'failed' || status === 'rejected') {
    await client.query(
      `update messages set status = 'failed', failure_reason = $2 where id = $1`,
      [message.id, report.failureReason ?? report.status],
    );
    // A delivery failure is clinical information: the doctor needs to know the
    // patient is not receiving their reminders at all.
    await raiseAlert(client, {
      patientId: message.patient_id,
      type: 'unreachable',
      severity: 'warning',
      context: { reason: report.failureReason ?? report.status },
    });
    return 'failed';
  }

  return 'ignored';
}

/** Unread free-text replies for a doctor's dashboard. */
export async function unreadInbound(doctorId: string) {
  return query<{ id: string; patient_id: string; patient_name: string; body: string; received_at: Date }>(
    `select i.id, i.patient_id, p.name as patient_name, i.body, i.received_at
       from inbound_messages i
       join patients p on p.id = i.patient_id
      where p.doctor_id = $1 and i.parsed_code is null
      order by i.received_at desc limit 50`,
    [doctorId],
  );
}
