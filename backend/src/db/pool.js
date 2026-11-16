import pg from 'pg';

export function createPool(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) throw new Error('Falta la variable de entorno DATABASE_URL');
  const needsSsl = !/localhost|127\.0\.0\.1/.test(connectionString);
  return new pg.Pool({ connectionString, ssl: needsSsl ? { rejectUnauthorized: false } : false });
}
