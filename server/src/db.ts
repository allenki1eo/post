import pg from 'pg';
import { config } from './config.js';

// timestamptz -> keep as Date (pg default). date (oid 1082) -> plain 'YYYY-MM-DD'
// string rather than a Date in the server's timezone, which would shift the day.
pg.types.setTypeParser(1082, (v) => v);
// int8 -> number. Counts here are small; bigints would leak strings into JSON.
pg.types.setTypeParser(20, (v) => Number(v));

export const pool = new pg.Pool({ connectionString: config.databaseUrl, max: 10 });

export type Queryable = Pick<pg.PoolClient, 'query'>;

export async function query<T extends pg.QueryResultRow = any>(
  text: string,
  params: unknown[] = [],
  client: Queryable = pool,
): Promise<T[]> {
  const res = await client.query<T>(text, params as any[]);
  return res.rows;
}

export async function one<T extends pg.QueryResultRow = any>(
  text: string,
  params: unknown[] = [],
  client: Queryable = pool,
): Promise<T | undefined> {
  const rows = await query<T>(text, params, client);
  return rows[0];
}

/** Run fn inside a transaction, rolling back on throw. */
export async function tx<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('begin');
    const result = await fn(client);
    await client.query('commit');
    return result;
  } catch (err) {
    await client.query('rollback').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

export async function closePool() {
  await pool.end();
}
