import { readFileSync } from 'node:fs';

export const schemaSql = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');

export async function migrate(db) {
  await db.query(schemaSql);
}
