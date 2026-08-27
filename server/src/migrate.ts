import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { closePool, query, tx } from './db.js';

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');

export async function migrate(log: (m: string) => void = console.log) {
  await query(`create table if not exists schema_migrations (
    name text primary key,
    applied_at timestamptz not null default now()
  )`);

  const applied = new Set(
    (await query<{ name: string }>('select name from schema_migrations')).map((r) => r.name),
  );
  const files = (await readdir(migrationsDir)).filter((f) => f.endsWith('.sql')).sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await readFile(join(migrationsDir, file), 'utf8');
    await tx(async (client) => {
      await client.query(sql);
      await client.query('insert into schema_migrations (name) values ($1)', [file]);
    });
    log(`applied ${file}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await migrate();
  await closePool();
}
