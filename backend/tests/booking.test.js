import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { setup, adminToken, registerClient, bearer } from './helpers.js';

// "Ahora": lunes 2026-03-02 08:00 (Argentina).
let app, db, admin, ana, serviceId;
beforeEach(async () => {
  ({ app, db } = await setup('2026-03-02T08:00:00-03:00'));
  admin = await adminToken(app, db);
  ana = await registerClient(app, 'ana@mail.com', 'Ana');
  const res = await request(app).post('/api/services').set(bearer(admin))
    .send({ name: 'Kapping', durationMin: 60, price: 12000 });
  serviceId = res.body.id;
});

const book = (token, date, time, id = serviceId) =>
  request(app).post('/api/appointments').set(bearer(token)).send({ serviceId: id, date, time });

describe('POST /api/appointments', () => {
  it('reserva un turno válido', async () => {
    const res = await book(ana, '2026-03-03', '10:00');
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ date: '2026-03-03', time: '10:00', status: 'confirmado', serviceName: 'Kapping' });
    expect(res.body.end).toBe('2026-03-03T14:00:00.000Z');
  });

  it('RN-04: sin sesión no se puede reservar', async () => {
    const res = await request(app).post('/api/appointments').send({ serviceId, date: '2026-03-03', time: '10:00' });
    expect(res.status).toBe(401);
  });

  it('RN-07: no se reserva un servicio inactivo', async () => {
    await request(app).put(`/api/services/${serviceId}`).set(bearer(admin)).send({ active: false });
    const res = await book(ana, '2026-03-03', '10:00');
    expect(res.body.rule).toBe('RN-07');
  });

  it('RN-09: domingo cerrado', async () => {
    expect((await book(ana, '2026-03-08', '10:00')).body.rule).toBe('RN-09');
  });

  it('RN-10: horario fuera de bloque de 30 min', async () => {
    expect((await book(ana, '2026-03-03', '10:10')).body.rule).toBe('RN-10');
  });

  it('RN-11: el turno no puede terminar después de las 19:00', async () => {
    expect((await book(ana, '2026-03-03', '18:30')).body.rule).toBe('RN-11');
  });

  it('RN-12: dos clientas no pueden tomar el mismo horario', async () => {
    const bea = await registerClient(app, 'bea@mail.com', 'Bea');
    expect((await book(ana, '2026-03-03', '10:00')).status).toBe(201);
    const res = await book(bea, '2026-03-03', '10:30');
    expect(res.status).toBe(409);
    expect(res.body.rule).toBe('RN-12');
  });

  it('RN-13: día bloqueado', async () => {
    await db.query("INSERT INTO blocked_days (day, reason) VALUES ('2026-03-03', 'Vacaciones')");
    expect((await book(ana, '2026-03-03', '10:00')).body.rule).toBe('RN-13');
  });

  it('RN-14: no se reserva con menos de 2 horas', async () => {
    expect((await book(ana, '2026-03-02', '09:00')).body.rule).toBe('RN-14');
  });

  it('RN-15: no se reserva con más de 30 días', async () => {
    expect((await book(ana, '2026-04-15', '10:00')).body.rule).toBe('RN-15');
  });

  it('RN-16: máximo 2 turnos futuros confirmados por clienta', async () => {
    expect((await book(ana, '2026-03-03', '10:00')).status).toBe(201);
    expect((await book(ana, '2026-03-04', '10:00')).status).toBe(201);
    const res = await book(ana, '2026-03-05', '10:00');
    expect(res.status).toBe(422);
    expect(res.body.rule).toBe('RN-16');
  });

  it('RN-16: los turnos cancelados no cuentan para el límite', async () => {
    await book(ana, '2026-03-03', '10:00');
    await book(ana, '2026-03-04', '10:00');
    await db.query("UPDATE appointments SET status = 'cancelado' WHERE id = 1");
    expect((await book(ana, '2026-03-05', '10:00')).status).toBe(201);
  });

  it('RN-17: una clienta con 2 ausencias no puede reservar', async () => {
    for (const day of ['2026-02-10', '2026-02-11']) {
      await db.query(
        "INSERT INTO appointments (user_id, service_id, start_at, end_at, status) VALUES (2, $1, $2, $3, 'ausente')",
        [serviceId, `${day}T13:00:00Z`, `${day}T14:00:00Z`],
      );
    }
    const res = await book(ana, '2026-03-03', '10:00');
    expect(res.status).toBe(422);
    expect(res.body.rule).toBe('RN-17');
  });

  it('la administradora no reserva turnos online', async () => {
    expect((await book(admin, '2026-03-03', '10:00')).status).toBe(403);
  });
});
