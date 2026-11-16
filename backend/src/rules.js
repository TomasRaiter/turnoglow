// Reglas de negocio puras (sin base de datos). Ver docs/spec.md.
import { badRequest } from './errors.js';

// ---------- Cuentas (RN-01..RN-03) ----------
export const MIN_PASSWORD = 8;

export function normalizeEmail(email) {
  return String(email ?? '').trim().toLowerCase();
}

export function validateRegistration({ name, email, password }) {
  if (!String(name ?? '').trim()) throw badRequest('El nombre es obligatorio');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email))) throw badRequest('Email inválido', 'RN-01');
  if (String(password ?? '').length < MIN_PASSWORD) {
    throw badRequest(`La contraseña debe tener al menos ${MIN_PASSWORD} caracteres`, 'RN-02');
  }
}

// ---------- Servicios (RN-06) ----------
export function validateService({ name, durationMin, price }) {
  if (!String(name ?? '').trim()) throw badRequest('El nombre del servicio es obligatorio', 'RN-06');
  const d = Number(durationMin);
  if (!Number.isInteger(d) || d < 30 || d > 240 || d % 30 !== 0) {
    throw badRequest('La duración debe ser múltiplo de 30 entre 30 y 240 minutos', 'RN-06');
  }
  const p = Number(price);
  if (!Number.isFinite(p) || p <= 0) throw badRequest('El precio debe ser mayor a 0', 'RN-06');
}

// ---------- Agenda (RN-09..RN-15) ----------
export const STUDIO_OFFSET = '-03:00'; // America/Argentina/Buenos_Aires, sin horario de verano
export const OPEN_TIME = '09:00';
export const CLOSE_TIME = '19:00';
export const SLOT_MIN = 30;
export const MIN_LEAD_HOURS = 2;
export const MAX_DAYS_AHEAD = 30;
const OFFSET_MS = 3 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
const fromMinutes = (n) => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;

export function isValidDate(str) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(str))) return false;
  const d = new Date(`${str}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === str;
}

export function isValidTime(str) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(str));
}

/** Fecha local (YYYY-MM-DD) + hora local (HH:MM) del estudio -> instante Date. */
export function toInstant(date, time) {
  return new Date(`${date}T${time}:00${STUDIO_OFFSET}`);
}

/** Instante -> { date, time, weekday } en hora del estudio. */
export function localParts(instant) {
  const shifted = new Date(new Date(instant).getTime() - OFFSET_MS);
  const iso = shifted.toISOString();
  return { date: iso.slice(0, 10), time: iso.slice(11, 16), weekday: shifted.getUTCDay() };
}

/** Rango [inicio, fin) del día local como instantes. */
export function dayRange(date) {
  const start = toInstant(date, '00:00');
  return { start, end: new Date(start.getTime() + DAY) };
}

export const overlaps = (aStart, aEnd, bStart, bEnd) =>
  new Date(aStart) < new Date(bEnd) && new Date(bStart) < new Date(aEnd);

/** RN-09/RN-10/RN-11: horarios de inicio posibles para una duración, sin mirar ocupación. */
export function daySlots(durationMin) {
  const slots = [];
  for (let m = toMinutes(OPEN_TIME); m + durationMin <= toMinutes(CLOSE_TIME); m += SLOT_MIN) {
    slots.push(fromMinutes(m));
  }
  return slots;
}

/**
 * Valida un horario de inicio. Devuelve null si es reservable o { rule, message } con la
 * primera regla violada. `busy` son los turnos confirmados [{ start, end }] y `blocked`
 * indica si el día está bloqueado.
 */
export function checkSlot({ start, durationMin, now, blocked = false, busy = [] }) {
  const begin = new Date(start);
  const end = new Date(begin.getTime() + durationMin * 60000);
  const { time, weekday } = localParts(begin);
  const minutes = toMinutes(time);

  if (begin.getTime() < now.getTime() + MIN_LEAD_HOURS * HOUR) {
    return { rule: 'RN-14', message: `Los turnos se reservan con al menos ${MIN_LEAD_HOURS} horas de anticipación` };
  }
  if (begin.getTime() > now.getTime() + MAX_DAYS_AHEAD * DAY) {
    return { rule: 'RN-15', message: `No se puede reservar con más de ${MAX_DAYS_AHEAD} días de anticipación` };
  }
  if (weekday === 0) return { rule: 'RN-09', message: 'El estudio no abre los domingos' };
  if (minutes < toMinutes(OPEN_TIME) || minutes >= toMinutes(CLOSE_TIME)) {
    return { rule: 'RN-09', message: `El estudio atiende de ${OPEN_TIME} a ${CLOSE_TIME}` };
  }
  if ((minutes - toMinutes(OPEN_TIME)) % SLOT_MIN !== 0) {
    return { rule: 'RN-10', message: 'Los turnos empiezan cada 30 minutos' };
  }
  if (minutes + durationMin > toMinutes(CLOSE_TIME)) {
    return { rule: 'RN-11', message: `El turno debe terminar antes de las ${CLOSE_TIME}` };
  }
  if (blocked) return { rule: 'RN-13', message: 'Ese día el estudio no atiende' };
  if (busy.some((b) => overlaps(begin, end, b.start, b.end))) {
    return { rule: 'RN-12', message: 'Ese horario ya está ocupado' };
  }
  return null;
}

/** Horarios libres de un día para un servicio. */
export function availableSlots({ date, durationMin, now, blocked = false, busy = [] }) {
  return daySlots(durationMin).filter(
    (time) => !checkSlot({ start: toInstant(date, time), durationMin, now, blocked, busy }),
  );
}
