import { Router } from 'express';
import { tx } from '../../db.js';
import { handleDeliveryReport, handleInboundSms } from '../../domain/inbound.js';

export const webhooksRouter = Router();

/**
 * Africa's Talking posts form-encoded callbacks and does not sign them. The
 * defence is a shared secret in the callback URL plus an IP allowlist at the
 * edge — set WEBHOOK_TOKEN in any environment reachable from the internet.
 */
function authorised(req: { query: Record<string, any>; header(name: string): string | undefined }) {
  const expected = process.env.WEBHOOK_TOKEN;
  if (!expected) return true;
  return req.query.token === expected || req.header('x-webhook-token') === expected;
}

// Inbound SMS: { from, to, text, date, id, linkId }
webhooksRouter.post('/sms/inbound', async (req, res) => {
  if (!authorised(req as any)) {
    res.status(401).json({ error: 'unauthorised' });
    return;
  }
  const from = String(req.body.from ?? '');
  const text = String(req.body.text ?? '');
  if (!from || !text) {
    res.status(400).json({ error: 'from and text are required' });
    return;
  }

  const outcome = await tx((client) =>
    handleInboundSms(client, {
      from,
      text,
      providerMessageId: req.body.id ? String(req.body.id) : undefined,
      receivedAt: req.body.date ? new Date(String(req.body.date)) : undefined,
    }),
  );

  // Always 200: a non-2xx makes the provider redeliver, and we have already
  // stored the message.
  res.json(outcome);
});

// Delivery report: { id, status, phoneNumber, failureReason }
webhooksRouter.post('/sms/delivery', async (req, res) => {
  if (!authorised(req as any)) {
    res.status(401).json({ error: 'unauthorised' });
    return;
  }
  const providerMessageId = String(req.body.id ?? '');
  const status = String(req.body.status ?? '');
  if (!providerMessageId || !status) {
    res.status(400).json({ error: 'id and status are required' });
    return;
  }

  const outcome = await tx((client) =>
    handleDeliveryReport(client, {
      providerMessageId,
      status,
      failureReason: req.body.failureReason ? String(req.body.failureReason) : undefined,
    }),
  );
  res.json({ outcome });
});
