import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { setup } from './helpers.js';

describe('API base', () => {
  it('responde /api/health usando el reloj inyectado', async () => {
    const { app } = await setup('2026-03-02T08:00:00-03:00');
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.now).toBe('2026-03-02T11:00:00.000Z');
  });

  it('devuelve 404 en rutas inexistentes', async () => {
    const { app } = await setup();
    const res = await request(app).get('/api/nada');
    expect(res.status).toBe(404);
  });
});
