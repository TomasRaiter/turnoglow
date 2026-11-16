import { newDb } from 'pg-mem';
import bcrypt from 'bcryptjs';
import request from 'supertest';
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

// Crea una administradora directo en la base (RN-03: no se puede por registro).
export async function createAdmin(db, email = 'admin@turnoglow.com', password = 'admin1234') {
  const hash = await bcrypt.hash(password, 4);
  await db.query("INSERT INTO users (name, email, password_hash, role) VALUES ('Admin', $1, $2, 'admin')", [email, hash]);
  return email;
}

export async function login(app, email, password) {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.token;
}

export async function registerClient(app, email = 'ana@mail.com', name = 'Ana') {
  const res = await request(app).post('/api/auth/register').send({ name, email, password: 'clave1234' });
  return res.body.token;
}

export async function adminToken(app, db) {
  const email = await createAdmin(db);
  return login(app, email, 'admin1234');
}

export const bearer = (token) => ({ Authorization: `Bearer ${token}` });
