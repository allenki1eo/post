import { createApp } from './api/app.js';
import { config } from './config.js';
import { migrate } from './migrate.js';
import { startWorker } from './worker.js';

await migrate();

const app = createApp();
const server = app.listen(config.port, () => {
  console.log(`[post] api on :${config.port} (sms gateway: ${config.sms.gateway})`);
});

const stopWorker = startWorker();

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    stopWorker();
    server.close(() => process.exit(0));
  });
}
