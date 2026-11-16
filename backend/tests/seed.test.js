import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { setup, login } from './helpers.js';
import { seed, SAMPLE_SERVICES } from '../src/db/seedData.js';

describe('Semilla de datos', () => {
  it('crea la administradora y los servicios una sola vez (idempotente)', async () => {
    const { app, db } = await setup();
    const opts = { adminEmail: 'Dueña@Estudio.com', adminPassword: 'segura1234' };
    await seed(db, opts);
    await seed(db, opts);
    const users = await db.query('SELECT role FROM users');
    expect(users.rows).toEqual([{ role: 'admin' }]);
    const services = await request(app).get('/api/services');
    expect(services.body).toHaveLength(SAMPLE_SERVICES.length);
    expect(await login(app, 'dueña@estudio.com', 'segura1234')).toBeTruthy();
  });

  it('sin variables de entorno no crea administradora', async () => {
    const { db } = await setup();
    await seed(db, {});
    expect((await db.query('SELECT * FROM users')).rows).toHaveLength(0);
  });
});
