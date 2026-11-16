import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { setup, adminToken, registerClient, bearer } from './helpers.js';

// "Ahora": lunes 2026-03-02 08:00 (Argentina).
let app, db, clock, admin, ana, bea, serviceId;
beforeEach(async () => {
  ({ app, db, clock } = await setup('2026-03-02T08:00:00-03:00'));
  admin = await adminToken(app, db);
  ana = await registerClient(app, 'ana@mail.com', 'Ana');
  bea = await registerClient(app, 'bea@mail.com', 'Bea');
  const res = await request(app).post('/api/services').set(bearer(admin))
    .send({ name: 'Kapping', durationMin: 60, price: 12000 });
  serviceId = res.body.id;
});

const book = (token, date, time) =>
  request(app).post('/api/appointments').set(bearer(token)).send({ serviceId, date, time });
const cancel = (token, id) => request(app).post(`/api/appointments/${id}/cancel`).set(bearer(token));
const mark = (id, status) => request(app).post(`/api/admin/appointments/${id}/status`).set(bearer(admin)).send({ status });

describe('Mis turnos', () => {
  it('RN-05: cada clienta ve solo sus turnos', async () => {
    await book(ana, '2026-03-03', '10:00');
    await book(bea, '2026-03-03', '12:00');
    const res = await request(app).get('/api/appointments/mine').set(bearer(ana));
    expect(res.body).toHaveLength(1);
    expect(res.body[0].clientEmail).toBe('ana@mail.com');
  });
});

describe('Cancelación', () => {
  it('RN-18: la clienta cancela con más de 24 h de anticipación', async () => {
    const { body } = await book(ana, '2026-03-04', '10:00');
    const res = await cancel(ana, body.id);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('cancelado');
  });

  it('RN-18: la clienta no puede cancelar con menos de 24 h', async () => {
    const { body } = await book(ana, '2026-03-03', '10:00');
    clock.set('2026-03-02T11:00:00-03:00'); // faltan 23 h
    const res = await cancel(ana, body.id);
    expect(res.status).toBe(422);
    expect(res.body.rule).toBe('RN-18');
  });

  it('RN-19: la administradora cancela aunque falten menos de 24 h', async () => {
    const { body } = await book(ana, '2026-03-02', '12:00');
    const res = await cancel(admin, body.id);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('cancelado');
  });

  it('RN-05: una clienta no puede cancelar el turno de otra', async () => {
    const { body } = await book(ana, '2026-03-04', '10:00');
    const res = await cancel(bea, body.id);
    expect(res.status).toBe(403);
    expect(res.body.rule).toBe('RN-05');
  });

  it('RN-21: no se cancela dos veces', async () => {
    const { body } = await book(ana, '2026-03-04', '10:00');
    await cancel(ana, body.id);
    const res = await cancel(ana, body.id);
    expect(res.status).toBe(422);
    expect(res.body.rule).toBe('RN-21');
  });

  it('cancelar libera el horario para otra clienta (RN-12)', async () => {
    const { body } = await book(ana, '2026-03-04', '10:00');
    await cancel(ana, body.id);
    expect((await book(bea, '2026-03-04', '10:00')).status).toBe(201);
  });
});

describe('Estados de turnos (administradora)', () => {
  it('RN-20: marca completado un turno que ya pasó', async () => {
    const { body } = await book(ana, '2026-03-02', '10:00');
    clock.set('2026-03-02T11:30:00-03:00');
    const res = await mark(body.id, 'completado');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('completado');
  });

  it('RN-20: no se marca un turno futuro', async () => {
    const { body } = await book(ana, '2026-03-03', '10:00');
    const res = await mark(body.id, 'ausente');
    expect(res.status).toBe(422);
    expect(res.body.rule).toBe('RN-20');
  });

  it('RN-20: estado inválido', async () => {
    const { body } = await book(ana, '2026-03-03', '10:00');
    expect((await mark(body.id, 'pendiente')).status).toBe(400);
  });

  it('RN-21: un turno completado no cambia más de estado', async () => {
    const { body } = await book(ana, '2026-03-02', '10:00');
    clock.set('2026-03-02T11:30:00-03:00');
    await mark(body.id, 'completado');
    const res = await mark(body.id, 'ausente');
    expect(res.status).toBe(422);
    expect(res.body.rule).toBe('RN-21');
    expect((await cancel(admin, body.id)).body.rule).toBe('RN-21');
  });

  it('RN-17 integrado: tras 2 ausencias la clienta queda inhabilitada', async () => {
    const a = await book(ana, '2026-03-02', '10:00');
    const b = await book(ana, '2026-03-02', '14:00');
    clock.set('2026-03-02T16:00:00-03:00');
    await mark(a.body.id, 'ausente');
    await mark(b.body.id, 'ausente');
    const res = await book(ana, '2026-03-05', '10:00');
    expect(res.body.rule).toBe('RN-17');
  });

  it('RN-04: una clienta no accede a la agenda ni cambia estados', async () => {
    expect((await request(app).get('/api/admin/appointments').set(bearer(ana))).status).toBe(403);
  });

  it('la agenda lista los turnos de un día con datos de la clienta', async () => {
    await book(ana, '2026-03-03', '10:00');
    await book(bea, '2026-03-03', '14:00');
    await book(bea, '2026-03-04', '14:00');
    const res = await request(app).get('/api/admin/appointments').query({ date: '2026-03-03' }).set(bearer(admin));
    expect(res.body.map((a) => [a.time, a.clientName])).toEqual([['10:00', 'Ana'], ['14:00', 'Bea']]);
  });
});
