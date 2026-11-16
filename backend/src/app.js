import express from 'express';
import cors from 'cors';
import { systemClock } from './clock.js';
import { AppError } from './errors.js';

export function createApp({ db, clock = systemClock, jwtSecret = process.env.JWT_SECRET, corsOrigin = process.env.CORS_ORIGIN } = {}) {
  if (!jwtSecret) throw new Error('Falta JWT_SECRET');
  const app = express();
  app.use(cors({ origin: corsOrigin ? corsOrigin.split(',') : true }));
  app.use(express.json());

  const ctx = { db, clock, jwtSecret };
  app.locals.ctx = ctx;

  app.get('/api/health', (_req, res) => res.json({ ok: true, now: clock.now().toISOString() }));

  app.use('/api', (_req, _res, next) => next(new AppError(404, 'Ruta inexistente')));

  // Manejador de errores: devuelve el mensaje y la regla de negocio violada.
  app.use((err, _req, res, _next) => {
    if (err instanceof AppError) {
      return res.status(err.status).json({ error: err.message, rule: err.rule });
    }
    if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON inválido' });
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  });

  return app;
}
