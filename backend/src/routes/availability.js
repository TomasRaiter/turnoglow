import { Router } from 'express';
import { availableSlots, dayRange, isValidDate, localParts } from '../rules.js';
import { badRequest } from '../errors.js';
import { findService } from './services.js';

/** Turnos confirmados que tocan el día local `date`. */
export async function busyOn(db, date) {
  const { start, end } = dayRange(date);
  const { rows } = await db.query(
    "SELECT start_at, end_at FROM appointments WHERE status = 'confirmado' AND start_at < $2 AND end_at > $1",
    [start, end],
  );
  return rows.map((r) => ({ start: new Date(r.start_at), end: new Date(r.end_at) }));
}

export async function isBlocked(db, date) {
  const { rows } = await db.query('SELECT day FROM blocked_days WHERE day = $1', [date]);
  return rows.length > 0;
}

export function availabilityRoutes() {
  const r = Router();

  r.get('/', async (req, res) => {
    const { db, clock } = req.app.locals.ctx;
    const { serviceId, date } = req.query;
    if (!isValidDate(date)) throw badRequest('Fecha inválida (formato AAAA-MM-DD)');
    const service = await findService(db, serviceId);
    if (!service.active) throw badRequest('El servicio no está disponible', 'RN-07');
    const blocked = await isBlocked(db, date);
    const busy = await busyOn(db, date);
    const now = clock.now();
    const slots = availableSlots({ date, durationMin: service.durationMin, now, blocked, busy });
    let reason = null;
    if (blocked) reason = 'Día no laborable';
    else if (localParts(new Date(`${date}T15:00:00Z`)).weekday === 0) reason = 'Domingo cerrado';
    res.json({ date, serviceId: service.id, durationMin: service.durationMin, slots, reason });
  });

  return r;
}
