const num = (v: string | undefined, fallback: number) => {
  const n = v === undefined ? NaN : Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export const config = {
  databaseUrl: process.env.DATABASE_URL ?? 'postgres://postgres@127.0.0.1:5432/post',
  port: num(process.env.PORT, 3000),
  sessionSecret: process.env.SESSION_SECRET ?? 'dev-only-secret',

  sms: {
    gateway: (process.env.SMS_GATEWAY ?? 'fake') as 'fake' | 'africastalking',
    username: process.env.AT_USERNAME ?? 'sandbox',
    apiKey: process.env.AT_API_KEY ?? '',
    senderId: process.env.AT_SENDER_ID ?? 'POST',
    baseUrl: process.env.AT_BASE_URL ?? 'https://api.sandbox.africastalking.com',
  },

  worker: {
    tickMs: num(process.env.WORKER_TICK_MS, 15_000),
    batchSize: num(process.env.WORKER_BATCH_SIZE, 50),
    maxSendAttempts: num(process.env.MAX_SEND_ATTEMPTS, 3),
    /** Hours after a scheduled dose before an unanswered dose counts as missed. */
    doseGraceHours: num(process.env.DOSE_GRACE_HOURS, 3),
  },

  /** No SMS between these local hours. A 22:00 dose sends at 21:00, naming the time. (D7) */
  quietHours: {
    start: num(process.env.QUIET_HOURS_START, 21),
    end: num(process.env.QUIET_HOURS_END, 6),
  },

  escalation: {
    consecutiveMisses: num(process.env.ESCALATE_CONSECUTIVE_MISSES, 2),
    missesInWindow: num(process.env.ESCALATE_MISSES_IN_WINDOW, 3),
    windowDays: num(process.env.ESCALATE_WINDOW_DAYS, 7),
  },

  /** Days after the last dose or visit before a plan auto-archives. (D3) */
  planTailDays: num(process.env.PLAN_TAIL_DAYS, 7),
  openEndedReviewDays: num(process.env.OPEN_ENDED_REVIEW_DAYS, 90),
};

export type Config = typeof config;
