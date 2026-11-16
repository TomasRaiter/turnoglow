// Uso: npm run seed  (requiere DATABASE_URL, ADMIN_EMAIL y ADMIN_PASSWORD en el entorno)
import { createPool } from './pool.js';
import { migrate } from './schema.js';
import { seed } from './seedData.js';

const pool = createPool();
await migrate(pool);
await seed(pool, { adminEmail: process.env.ADMIN_EMAIL, adminPassword: process.env.ADMIN_PASSWORD });
await pool.end();
