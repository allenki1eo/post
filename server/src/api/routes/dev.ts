import { Router } from 'express';
import { query } from '../../db.js';
import { requireDoctor } from '../auth.js';
import { FakeSmsGateway, smsGateway } from '../../sms/index.js';
import { tick } from '../../worker.js';

/**
 * Demo-only surface. Mounted when POST_DEMO=1 so the vertical slice can be
 * driven from the browser: run a tick on demand, read the SMS outbox, and post
 * a reply as if it came from the patient's phone. Never mounted in production.
 */
export const devRouter = Router();
devRouter.use(requireDoctor);

devRouter.post('/tick', async (req, res) => {
  const at = req.body?.now ? new Date(String(req.body.now)) : new Date();
  res.json(await tick(at));
});

devRouter.get('/outbox', async (req, res) => {
  const gateway = smsGateway();
  const sent = await query(
    `select m.id, m.to_phone, m.body, m.kind, m.status, m.attempts,
            m.scheduled_for, m.sent_at, m.delivered_at, m.failure_reason,
            p.name as patient_name, p.timezone
       from messages m join patients p on p.id = m.patient_id
      where p.doctor_id = $1
      order by coalesce(m.sent_at, m.scheduled_for) desc limit 50`,
    [req.doctorId],
  );
  res.json({
    gateway: gateway.name,
    messages: sent,
    fake_outbox: gateway instanceof FakeSmsGateway ? gateway.outbox.slice(-20) : undefined,
  });
});
