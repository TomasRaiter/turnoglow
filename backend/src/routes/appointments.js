import { Router } from 'express';
import { checkClientLimits, checkSlot, isValidDate, isValidTime, localParts, toInstant } from '../rules.js';
import { AppError, badRequest, forbidden } from '../errors.js';
import { requireAuth } from '../auth.js';
import { findService } from './services.js';
import { busyOn, isBlocked } from './availability.js';

export const APPOINTMENT_SELECT = `
  SELECT a.*, s.name AS service_name, s.price AS service_price, u.name AS client_name, u.email AS client_email
  FROM appointments a
  JOIN services s ON s.id = a.service_id
  JOIN users u ON u.id = a.user_id`;

export function toAppointment(row) {
  const start = new Date(row.start_at);
  const { date, time } = localParts(start);
  return {
    id: row.id,
    userId: row.user_id,
    serviceId: row.service_id,
    serviceName: row.service_name,
    price: Number(row.service_price),
    clientName: row.client_name,
    clientEmail: row.client_email,
    start: start.toISOString(),
    end: new Date(row.end_at).toISOString(),
    date,
    time,
    status: row.status,
  };
}

export async function findAppointment(db, id) {
  const { rows } = await db.query(`${APPOINTMENT_SELECT} WHERE a.id = $1`, [Number(id)]);
  if (!rows[0]) throw new AppError(404, 'El turno no existe');
  return toAppointment(rows[0]);
}

export function appointmentRoutes() {
  const r = Router();

  r.post('/', requireAuth, async (req, res) => {
    const { db, clock } = req.app.locals.ctx;
    if (req.user.role !== 'cliente') throw forbidden('Solo las clientas reservan turnos online');
    const { serviceId, date, time } = req.body ?? {};
    if (!isValidDate(date) || !isValidTime(time)) throw badRequest('Fecha u hora inválida');

    const service = await findService(db, serviceId);
    if (!service.active) throw badRequest('El servicio no está disponible', 'RN-07');

    const now = clock.now();

    // RN-16 y RN-17: límites de la clienta.
    const { rows: [active] } = await db.query(
      "SELECT COUNT(*)::int AS n FROM appointments WHERE user_id = $1 AND status = 'confirmado' AND start_at > $2",
      [req.user.id, now],
    );
    const { rows: [absent] } = await db.query(
      "SELECT COUNT(*)::int AS n FROM appointments WHERE user_id = $1 AND status = 'ausente'",
      [req.user.id],
    );
    const limit = checkClientLimits({ activeFuture: Number(active.n), noShows: Number(absent.n) });
    if (limit) throw new AppError(422, limit.message, limit.rule);

    // RN-09..RN-15: horario válido y libre.
    const start = toInstant(date, time);
    const problem = checkSlot({
      start,
      durationMin: service.durationMin,
      now,
      blocked: await isBlocked(db, date),
      busy: await busyOn(db, date),
    });
    if (problem) throw new AppError(problem.rule === 'RN-12' ? 409 : 422, problem.message, problem.rule);

    const end = new Date(start.getTime() + service.durationMin * 60000);
    const { rows } = await db.query(
      "INSERT INTO appointments (user_id, service_id, start_at, end_at, status) VALUES ($1, $2, $3, $4, 'confirmado') RETURNING id",
      [req.user.id, service.id, start, end],
    );
    res.status(201).json(await findAppointment(db, rows[0].id));
  });

  return r;
}
