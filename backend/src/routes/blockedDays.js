import { Router } from 'express';
import { dayRange, isValidDate } from '../rules.js';
import { badRequest, conflict, notFound } from '../errors.js';
import { requireAdmin } from '../auth.js';

export function blockedDayRoutes() {
  const r = Router();

  r.get('/', async (req, res) => {
    const { db } = req.app.locals.ctx;
    const { rows } = await db.query('SELECT day, reason FROM blocked_days ORDER BY day');
    res.json(rows.map((b) => ({ date: b.day, reason: b.reason })));
  });

  r.post('/', requireAdmin, async (req, res) => {
    const { db } = req.app.locals.ctx;
    const { date, reason = '' } = req.body ?? {};
    if (!isValidDate(date)) throw badRequest('Fecha inválida (formato AAAA-MM-DD)');
    const exists = await db.query('SELECT day FROM blocked_days WHERE day = $1', [date]);
    if (exists.rows.length) throw conflict('Ese día ya está bloqueado');
    // RN-22: no se bloquea un día con turnos confirmados.
    const { start, end } = dayRange(date);
    const { rows } = await db.query(
      "SELECT COUNT(*)::int AS n FROM appointments WHERE status = 'confirmado' AND start_at >= $1 AND start_at < $2",
      [start, end],
    );
    if (Number(rows[0].n) > 0) {
      throw conflict(`Ese día tiene ${rows[0].n} turno(s) confirmado(s). Cancelalos antes de bloquearlo`, 'RN-22');
    }
    await db.query('INSERT INTO blocked_days (day, reason) VALUES ($1, $2)', [date, String(reason).trim()]);
    res.status(201).json({ date, reason: String(reason).trim() });
  });

  r.delete('/:date', requireAdmin, async (req, res) => {
    const { db } = req.app.locals.ctx;
    const result = await db.query('DELETE FROM blocked_days WHERE day = $1 RETURNING day', [req.params.date]);
    if (!result.rows.length) throw notFound('Ese día no estaba bloqueado');
    res.status(204).end();
  });

  return r;
}
