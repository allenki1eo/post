/**
 * Tests run against a real Postgres, not a mock: the reminder engine leans on
 * `for update skip locked`, partial unique indexes, and timestamptz arithmetic,
 * and a fake would only prove the fake works.
 *
 * Point TEST_DATABASE_URL at any throwaway database.
 */
export default async function setup() {
  process.env.DATABASE_URL =
    process.env.TEST_DATABASE_URL ?? 'postgres://postgres@127.0.0.1:5432/post_test';
  process.env.SESSION_SECRET = 'test-secret';
  process.env.SMS_GATEWAY = 'fake';
}
