import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { setup, adminToken, registerClient, bearer } from './helpers.js';

let app, db, admin;
beforeEach(async () => {
  ({ app, db } = await setup());
  admin = await adminToken(app, db);
});

const create = (body, token = admin) => request(app).post('/api/services').set(bearer(token)).send(body);
const kapping = { name: 'Kapping gel', description: 'Uñas naturales', durationMin: 60, price: 12000 };

describe('Servicios', () => {
  it('la administradora crea un servicio', async () => {
    const res = await create(kapping);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'Kapping gel', durationMin: 60, price: 12000, active: true });
  });

  it('RN-04: una clienta no puede crear servicios', async () => {
    const client = await registerClient(app);
    const res = await create(kapping, client);
    expect(res.status).toBe(403);
  });

  it('RN-06: nombre obligatorio', async () => {
    const res = await create({ ...kapping, name: '  ' });
    expect(res.status).toBe(400);
    expect(res.body.rule).toBe('RN-06');
  });

  it.each([0, 20, 45, 270])('RN-06: rechaza duración %i', async (durationMin) => {
    const res = await create({ ...kapping, durationMin });
    expect(res.status).toBe(400);
    expect(res.body.rule).toBe('RN-06');
  });

  it('RN-06: el precio debe ser mayor a 0', async () => {
    const res = await create({ ...kapping, price: 0 });
    expect(res.status).toBe(400);
    expect(res.body.rule).toBe('RN-06');
  });

  it('RN-07: el catálogo público solo muestra servicios activos', async () => {
    await create(kapping);
    await create({ ...kapping, name: 'Lifting de pestañas', active: false });
    const pub = await request(app).get('/api/services');
    expect(pub.body.map((s) => s.name)).toEqual(['Kapping gel']);
    const all = await request(app).get('/api/services/all').set(bearer(admin));
    expect(all.body).toHaveLength(2);
  });

  it('edita y desactiva un servicio', async () => {
    const { body } = await create(kapping);
    const res = await request(app).put(`/api/services/${body.id}`).set(bearer(admin)).send({ price: 15000, active: false });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ price: 15000, active: false });
  });

  it('elimina un servicio sin turnos', async () => {
    const { body } = await create(kapping);
    const res = await request(app).delete(`/api/services/${body.id}`).set(bearer(admin));
    expect(res.status).toBe(204);
  });

  it('RN-08: no elimina un servicio con turnos asociados', async () => {
    const { body } = await create(kapping);
    await registerClient(app);
    await db.query(
      "INSERT INTO appointments (user_id, service_id, start_at, end_at) VALUES (2, $1, '2026-03-03T12:00:00Z', '2026-03-03T13:00:00Z')",
      [body.id],
    );
    const res = await request(app).delete(`/api/services/${body.id}`).set(bearer(admin));
    expect(res.status).toBe(409);
    expect(res.body.rule).toBe('RN-08');
  });
});
