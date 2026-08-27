import { afterAll, beforeAll, beforeEach } from 'vitest';
import { closePool, query } from '../src/db.js';
import { migrate } from '../src/migrate.js';
import { FakeSmsGateway, setSmsGateway } from '../src/sms/index.js';

export const fakeSms = new FakeSmsGateway();

beforeAll(async () => {
  await migrate(() => {});
  setSmsGateway(fakeSms);
});

beforeEach(async () => {
  await query(`truncate doctors, patients, care_plans, medications, follow_up_visits,
               medication_logs, check_ins, messages, inbound_messages, alerts, access_log
               restart identity cascade`);
  fakeSms.clear();
});

afterAll(async () => {
  await closePool();
});
