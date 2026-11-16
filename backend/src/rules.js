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
