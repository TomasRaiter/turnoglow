import { newDb } from 'pg-mem';
import { createApp } from '../src/app.js';
import { fixedClock } from '../src/clock.js';
import { schemaSql } from '../src/db/schema.js';

// Crea una app con Postgres en memoria y un reloj fijo.
// Por defecto "ahora" es lunes 2026-03-02 08:00 hora Argentina.
export async function setup(nowIso = '2026-03-02T08:00:00-03:00') {
  const mem = newDb();
  mem.public.none(schemaSql);
  const { Pool } = mem.adapters.createPg();
  const db = new Pool();
  const clock = fixedClock(nowIso);
  const app = createApp({ db, clock, jwtSecret: 'secreto-de-test' });
  return { app, db, clock };
}
