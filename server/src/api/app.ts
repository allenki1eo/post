import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { authRouter } from './routes/auth.js';
import { devRouter } from './routes/dev.js';
import { patientsRouter } from './routes/patients.js';
import { triageRouter } from './routes/triage.js';
import { webhooksRouter } from './routes/webhooks.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '256kb' }));
  // Provider webhooks arrive form-encoded.
  app.use(express.urlencoded({ extended: false }));

  app.get('/health', (_req, res) => res.json({ ok: true }));

  app.use('/api/auth', authRouter);
  app.use('/api/patients', patientsRouter);
  app.use('/api/triage', triageRouter);
  app.use('/api/webhooks', webhooksRouter);

  if (process.env.POST_DEMO === '1') {
    app.use('/api/dev', devRouter);
    const publicDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public');
    app.use(express.static(publicDir));
  }

  // Errors carry no internals: a stack trace in a response is a gift to an
  // attacker and useless to a doctor.
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[api]', err);
    res.status(err?.status ?? 500).json({ error: 'something went wrong' });
  });

  return app;
}
