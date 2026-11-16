import { Router } from 'express';
import { validateService } from '../rules.js';
import { conflict, notFound } from '../errors.js';
import { requireAdmin } from '../auth.js';

export const toService = (row) => ({
  id: row.id,
  name: row.name,
  description: row.description,
  durationMin: row.duration_min,
  price: Number(row.price),
  active: row.active,
});

export async function findService(db, id) {
  const { rows } = await db.query('SELECT * FROM services WHERE id = $1', [Number(id)]);
  if (!rows[0]) throw notFound('El servicio no existe');
  return toService(rows[0]);
}

export function serviceRoutes() {
  const r = Router();

  // RN-07: las clientas solo ven servicios activos.
  r.get('/', async (req, res) => {
    const { db } = req.app.locals.ctx;
    const { rows } = await db.query('SELECT * FROM services WHERE active = true ORDER BY name');
    res.json(rows.map(toService));
  });

  r.get('/all', requireAdmin, async (req, res) => {
    const { db } = req.app.locals.ctx;
    const { rows } = await db.query('SELECT * FROM services ORDER BY name');
    res.json(rows.map(toService));
  });

  r.post('/', requireAdmin, async (req, res) => {
    const { db } = req.app.locals.ctx;
    const { name, description = '', durationMin, price, active = true } = req.body ?? {};
    validateService({ name, durationMin, price });
    const { rows } = await db.query(
      'INSERT INTO services (name, description, duration_min, price, active) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [String(name).trim(), String(description), Number(durationMin), Math.round(Number(price)), Boolean(active)],
    );
    res.status(201).json(toService(rows[0]));
  });

  r.put('/:id', requireAdmin, async (req, res) => {
    const { db } = req.app.locals.ctx;
    const current = await findService(db, req.params.id);
    const next = { ...current, ...req.body };
    validateService(next);
    const { rows } = await db.query(
      'UPDATE services SET name = $1, description = $2, duration_min = $3, price = $4, active = $5 WHERE id = $6 RETURNING *',
      [String(next.name).trim(), String(next.description ?? ''), Number(next.durationMin), Math.round(Number(next.price)), Boolean(next.active), current.id],
    );
    res.json(toService(rows[0]));
  });

  // RN-08: no se elimina un servicio con turnos; se desactiva.
  r.delete('/:id', requireAdmin, async (req, res) => {
    const { db } = req.app.locals.ctx;
    const service = await findService(db, req.params.id);
    const { rows } = await db.query('SELECT COUNT(*)::int AS n FROM appointments WHERE service_id = $1', [service.id]);
    if (Number(rows[0].n) > 0) {
      throw conflict('El servicio tiene turnos asociados. Desactivalo en lugar de eliminarlo', 'RN-08');
    }
    await db.query('DELETE FROM services WHERE id = $1', [service.id]);
    res.status(204).end();
  });

  return r;
}
