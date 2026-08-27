import type { PoolClient } from 'pg';
import { config } from './config.js';
import { one, query, tx } from './db.js';
import {
  closeExpiredPlans, evaluateAdherence, markMissedDoses, raiseAlert, sweepMissedVisits,
} from './domain/escalation.js';
import { expandAllActivePlans } from './domain/scheduling.js';
import { backoffFrom } from './domain/time.js';
import { smsGateway } from './sms/index.js';

/**
 * The reminder engine. Reminder delivery is POST's core promise, so nothing here
 * is fire-and-forget: every message is claimed, attempted, and either confirmed
 * or escalated. (PRODUCT.md §8, DECISIONS.md D8)
 *
 * The queue is Postgres itself — `for update skip locked` over a due-message
 * index. That keeps the deployment to one database and makes the outbox
 * inspectable with SQL, which matters more here than throughput ever will.
 */

export interface TickResult {
  expanded: number;
  sent: number;
  failed: number;
  retried: number;
  missedDoses: number;
  missedVisits: number;
  plansClosed: number;
  alertsRaised: number;
}

interface DueMessage {
  id: string;
  patient_id: string;
  check_in_id: string | null;
  channel: 'sms' | 'push';
  to_phone: string;
  body: string;
  attempts: number;
}

/**
 * Claim a batch of due messages. `skip locked` lets several workers run without
 * two of them sending the same reminder twice.
 */
async function claimDue(client: PoolClient, now: Date, limit: number): Promise<DueMessage[]> {
  return query<DueMessage>(
    `with due as (
       select id from messages
        where status = 'queued'
          and scheduled_for <= $1
          and (next_attempt_at is null or next_attempt_at <= $1)
        order by scheduled_for
        limit $2
        for update skip locked
     )
     update messages m
        set status = 'sending', attempts = m.attempts + 1
       from due
      where m.id = due.id
      returning m.id, m.patient_id, m.check_in_id, m.channel, m.to_phone, m.body, m.attempts`,
    [now, limit],
    client,
  );
}

async function deliver(client: PoolClient, message: DueMessage, now: Date) {
  // Push is declared in the schema but v1 delivers over SMS; see scheduling.ts.
  const result = await smsGateway().send(message.to_phone, message.body);

  if (result.accepted) {
    await client.query(
      `update messages set status = 'sent', sent_at = $2, provider_message_id = $3,
              failure_reason = null
        where id = $1`,
      [message.id, now, result.providerMessageId ?? null],
    );
    if (message.check_in_id) {
      await client.query(`update check_ins set sent_at = coalesce(sent_at, $2) where id = $1`, [
        message.check_in_id,
        now,
      ]);
    }
    return 'sent' as const;
  }

  if (message.attempts >= config.worker.maxSendAttempts) {
    await client.query(
      `update messages set status = 'failed', failure_reason = $2 where id = $1`,
      [message.id, result.failureReason ?? 'send failed'],
    );

    const recentFailures = await one<{ count: number }>(
      `select count(*) as count from messages
        where patient_id = $1 and status = 'failed' and created_at > $2`,
      [message.patient_id, new Date(now.getTime() - 86_400_000)],
      client,
    );

    await raiseAlert(client, {
      patientId: message.patient_id,
      type: 'unreachable',
      severity: (recentFailures?.count ?? 0) >= 3 ? 'critical' : 'warning',
      context: {
        reason: result.failureReason ?? 'send failed',
        attempts: message.attempts,
        failed_last_24h: recentFailures?.count ?? 0,
      },
    });
    return 'failed' as const;
  }

  await client.query(
    `update messages set status = 'queued', next_attempt_at = $2, failure_reason = $3
      where id = $1`,
    [message.id, backoffFrom(now, message.attempts), result.failureReason ?? 'send failed'],
  );
  return 'retried' as const;
}

export async function tick(now = new Date()): Promise<TickResult> {
  const result: TickResult = {
    expanded: 0, sent: 0, failed: 0, retried: 0,
    missedDoses: 0, missedVisits: 0, plansClosed: 0, alertsRaised: 0,
  };

  // 1. Keep the rolling horizon full — including for open-ended plans.
  result.expanded = await tx((client) => expandAllActivePlans(client, now));

  // 2. Send what is due. Each message is its own transaction: one provider
  //    failure must not roll back the batch that already went out.
  for (;;) {
    const batch = await tx((client) => claimDue(client, now, config.worker.batchSize));
    if (batch.length === 0) break;

    for (const message of batch) {
      const outcome = await tx((client) => deliver(client, message, now));
      if (outcome === 'sent') result.sent += 1;
      else if (outcome === 'failed') result.failed += 1;
      else result.retried += 1;
    }
    if (batch.length < config.worker.batchSize) break;
  }

  // 3. Silence becomes a fact, then an alert.
  await tx(async (client) => {
    const patients = await markMissedDoses(client, now);
    result.missedDoses = patients.length;
    for (const patientId of patients) {
      const outcome = await evaluateAdherence(client, patientId, now);
      if (outcome === 'raised') result.alertsRaised += 1;
    }
    result.missedVisits = await sweepMissedVisits(client, now);
    result.plansClosed = (await closeExpiredPlans(client, now)).length;
  });

  return result;
}

export function startWorker(intervalMs = config.worker.tickMs) {
  let running = false;
  const run = async () => {
    if (running) return; // a slow tick must not overlap itself
    running = true;
    try {
      const result = await tick();
      if (result.sent || result.failed || result.alertsRaised) {
        console.log('[worker]', JSON.stringify(result));
      }
    } catch (err) {
      console.error('[worker] tick failed', err);
    } finally {
      running = false;
    }
  };

  const timer = setInterval(run, intervalMs);
  timer.unref?.();
  void run();
  return () => clearInterval(timer);
}
