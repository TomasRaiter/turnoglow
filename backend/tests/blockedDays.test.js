import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { setup, adminToken, registerClient, bearer } from './helpers.js';

let app, db, admin, ana, serviceId;
beforeEach(async () => {
  ({ app, db } = await setup('2026-03-02T08:00:00-03:00'));
  admin = await adminToken(app, db);
  ana = await registerClient(app);
  const res = await request(app).post('/api/services').set(bearer(admin))
    .send({ name: 'Kapping', durationMin: 60, price: 12000 });
  serviceId = res.body.id;
});

const block = (date, token = admin) =>
  request(app).post('/api/blocked-days').set(bearer(token)).send({ date, reason: 'Feriado' });

describe('Días bloqueados', () => {
  it('la administradora bloquea y desbloquea un día', async () => {
    expect((await block('2026-03-24')).status).toBe(201);
    expect((await request(app).get('/api/blocked-days')).body).toEqual([{ date: '2026-03-24', reason: 'Feriado' }]);
    expect((await request(app).delete('/api/blocked-days/2026-03-24').set(bearer(admin))).status).toBe(204);
    expect((await request(app).get('/api/blocked-days')).body).toEqual([]);
  });

  it('RN-04: una clienta no puede bloquear días', async () => {
    expect((await block('2026-03-24', ana)).status).toBe(403);
  });

  it('RN-13: un día bloqueado no admite reservas', async () => {
    await block('2026-03-24');
    const res = await request(app).post('/api/appointments').set(bearer(ana))
      .send({ serviceId, date: '2026-03-24', time: '10:00' });
    expect(res.body.rule).toBe('RN-13');
  });

  it('RN-22: no se bloquea un día con turnos confirmados', async () => {
    await request(app).post('/api/appointments').set(bearer(ana)).send({ serviceId, date: '2026-03-24', time: '10:00' });
    const res = await block('2026-03-24');
    expect(res.status).toBe(409);
    expect(res.body.rule).toBe('RN-22');
  });

  it('RN-22: si el turno se canceló, el día se puede bloquear', async () => {
    const { body } = await request(app).post('/api/appointments').set(bearer(ana))
      .send({ serviceId, date: '2026-03-24', time: '10:00' });
    await request(app).post(`/api/appointments/${body.id}/cancel`).set(bearer(admin));
    expect((await block('2026-03-24')).status).toBe(201);
  });

  it('no bloquea dos veces el mismo día ni fechas inválidas', async () => {
    await block('2026-03-24');
    expect((await block('2026-03-24')).status).toBe(409);
    expect((await block('24/03/2026')).status).toBe(400);
  });
});
