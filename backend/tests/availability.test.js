import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { setup, adminToken, bearer } from './helpers.js';

let app, db, serviceId;
beforeEach(async () => {
  ({ app, db } = await setup('2026-03-02T08:00:00-03:00'));
  const admin = await adminToken(app, db);
  const res = await request(app).post('/api/services').set(bearer(admin))
    .send({ name: 'Lifting', durationMin: 90, price: 18000 });
  serviceId = res.body.id;
});

const get = (date, id = serviceId) => request(app).get('/api/availability').query({ serviceId: id, date });

describe('GET /api/availability', () => {
  it('lista horarios libres de un martes para un servicio de 90 min (RN-09..RN-11)', async () => {
    const res = await get('2026-03-03');
    expect(res.status).toBe(200);
    expect(res.body.slots[0]).toBe('09:00');
    expect(res.body.slots.at(-1)).toBe('17:30');
    expect(res.body.slots).toHaveLength(18);
  });

  it('RN-09: domingo sin horarios', async () => {
    const res = await get('2026-03-08');
    expect(res.body.slots).toEqual([]);
    expect(res.body.reason).toBe('Domingo cerrado');
  });

  it('RN-12: excluye horarios superpuestos con turnos confirmados', async () => {
    await db.query("INSERT INTO users (name, email, password_hash) VALUES ('X', 'x@x.com', 'h')");
    await db.query(
      "INSERT INTO appointments (user_id, service_id, start_at, end_at) VALUES (2, $1, '2026-03-03T13:00:00Z', '2026-03-03T14:30:00Z')",
      [serviceId],
    );
    const { body } = await get('2026-03-03');
    expect(body.slots).not.toContain('10:00');
    expect(body.slots).not.toContain('11:00');
    expect(body.slots).not.toContain('09:00'); // 09:00-10:30 pisa el turno de 10:00
    expect(body.slots).toContain('11:30'); // empieza justo cuando termina el otro
  });

  it('RN-12: un turno cancelado libera el horario', async () => {
    await db.query("INSERT INTO users (name, email, password_hash) VALUES ('X', 'x@x.com', 'h')");
    await db.query(
      "INSERT INTO appointments (user_id, service_id, start_at, end_at, status) VALUES (2, $1, '2026-03-03T13:00:00Z', '2026-03-03T14:30:00Z', 'cancelado')",
      [serviceId],
    );
    const { body } = await get('2026-03-03');
    expect(body.slots).toContain('10:00');
  });

  it('RN-13: día bloqueado sin horarios', async () => {
    await db.query("INSERT INTO blocked_days (day, reason) VALUES ('2026-03-03', 'Feriado')");
    const { body } = await get('2026-03-03');
    expect(body.slots).toEqual([]);
    expect(body.reason).toBe('Día no laborable');
  });

  it('RN-14: hoy solo aparecen horarios con 2 h de anticipación', async () => {
    const { body } = await get('2026-03-02');
    expect(body.slots[0]).toBe('10:00');
  });

  it('RN-15: más de 30 días adelante no hay horarios', async () => {
    const { body } = await get('2026-04-10');
    expect(body.slots).toEqual([]);
  });

  it('RN-07: un servicio inactivo no tiene disponibilidad', async () => {
    await db.query('UPDATE services SET active = false');
    const res = await get('2026-03-03');
    expect(res.status).toBe(400);
    expect(res.body.rule).toBe('RN-07');
  });

  it('valida la fecha', async () => {
    expect((await get('mañana')).status).toBe(400);
  });
});
