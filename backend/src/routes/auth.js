import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { normalizeEmail, validateRegistration } from '../rules.js';
import { conflict, unauthorized } from '../errors.js';
import { requireAuth, signToken } from '../auth.js';

const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role });

export function authRoutes() {
  const r = Router();

  r.post('/register', async (req, res) => {
    const { db, jwtSecret } = req.app.locals.ctx;
    const { name, email, password } = req.body ?? {};
    validateRegistration({ name, email, password });
    const mail = normalizeEmail(email);
    const exists = await db.query('SELECT id FROM users WHERE email = $1', [mail]);
    if (exists.rows.length) throw conflict('Ya existe una cuenta con ese email', 'RN-01');
    const hash = await bcrypt.hash(password, 10); // RN-02
    // RN-03: el registro público siempre crea clientas, aunque manden otro rol.
    const { rows } = await db.query(
      "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'cliente') RETURNING id, name, email, role",
      [String(name).trim(), mail, hash],
    );
    const user = rows[0];
    res.status(201).json({ token: signToken(user, jwtSecret), user: publicUser(user) });
  });

  r.post('/login', async (req, res) => {
    const { db, jwtSecret } = req.app.locals.ctx;
    const { email, password } = req.body ?? {};
    const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [normalizeEmail(email)]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(String(password ?? ''), user.password_hash))) {
      throw unauthorized('Email o contraseña incorrectos');
    }
    res.json({ token: signToken(user, jwtSecret), user: publicUser(user) });
  });

  r.get('/me', requireAuth, async (req, res) => {
    const { db } = req.app.locals.ctx;
    const { rows } = await db.query('SELECT id, name, email, role FROM users WHERE id = $1', [req.user.id]);
    if (!rows[0]) throw unauthorized();
    res.json(rows[0]);
  });

  return r;
}
