import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { setup, createAdmin, login, bearer } from './helpers.js';

let app, db;
beforeEach(async () => ({ app, db } = await setup()));

const reg = (body) => request(app).post('/api/auth/register').send(body);

describe('Autenticación', () => {
  it('registra una clienta y devuelve token', async () => {
    const res = await reg({ name: 'Ana', email: 'ana@mail.com', password: 'clave1234' });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.email).toBe('ana@mail.com');
  });

  it('RN-01: no permite dos cuentas con el mismo email (sin importar mayúsculas)', async () => {
    await reg({ name: 'Ana', email: 'ana@mail.com', password: 'clave1234' });
    const res = await reg({ name: 'Otra', email: 'ANA@mail.com', password: 'clave1234' });
    expect(res.status).toBe(409);
    expect(res.body.rule).toBe('RN-01');
  });

  it('RN-01: rechaza emails inválidos', async () => {
    const res = await reg({ name: 'Ana', email: 'no-es-email', password: 'clave1234' });
    expect(res.status).toBe(400);
  });

  it('RN-02: exige contraseña de al menos 8 caracteres', async () => {
    const res = await reg({ name: 'Ana', email: 'ana@mail.com', password: '1234567' });
    expect(res.status).toBe(400);
    expect(res.body.rule).toBe('RN-02');
  });

  it('RN-02: guarda la contraseña hasheada, nunca en texto plano', async () => {
    await reg({ name: 'Ana', email: 'ana@mail.com', password: 'clave1234' });
    const { rows } = await db.query('SELECT password_hash FROM users');
    expect(rows[0].password_hash).not.toBe('clave1234');
    expect(rows[0].password_hash.startsWith('$2')).toBe(true);
  });

  it('RN-03: el registro ignora un rol enviado y crea siempre cliente', async () => {
    const res = await reg({ name: 'Ana', email: 'ana@mail.com', password: 'clave1234', role: 'admin' });
    expect(res.body.user.role).toBe('cliente');
  });

  it('login correcto e incorrecto', async () => {
    await reg({ name: 'Ana', email: 'ana@mail.com', password: 'clave1234' });
    expect((await request(app).post('/api/auth/login').send({ email: 'ana@mail.com', password: 'clave1234' })).status).toBe(200);
    expect((await request(app).post('/api/auth/login').send({ email: 'ana@mail.com', password: 'mala12345' })).status).toBe(401);
  });

  it('RN-04: /me requiere token válido', async () => {
    expect((await request(app).get('/api/auth/me')).status).toBe(401);
    expect((await request(app).get('/api/auth/me').set(bearer('basura'))).status).toBe(401);
    const email = await createAdmin(db);
    const token = await login(app, email, 'admin1234');
    const res = await request(app).get('/api/auth/me').set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('admin');
  });
});
