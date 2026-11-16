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
