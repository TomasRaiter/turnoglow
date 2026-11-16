import jwt from 'jsonwebtoken';
import { unauthorized, forbidden } from './errors.js';

export function signToken(user, secret) {
  return jwt.sign({ id: user.id, role: user.role, name: user.name }, secret, { expiresIn: '7d' });
}

// RN-04: las rutas protegidas requieren un token válido.
export function requireAuth(req, _res, next) {
  const { jwtSecret } = req.app.locals.ctx;
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(unauthorized());
  try {
    req.user = jwt.verify(token, jwtSecret);
    next();
  } catch {
    next(unauthorized('Sesión inválida o vencida'));
  }
}

export function requireAdmin(req, res, next) {
  requireAuth(req, res, (err) => {
    if (err) return next(err);
    if (req.user.role !== 'admin') return next(forbidden('Solo la administradora puede hacer esto'));
    next();
  });
}
