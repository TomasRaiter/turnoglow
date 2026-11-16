// Uso: npm run migrate  (aplica el esquema sobre DATABASE_URL)
import { createPool } from './pool.js';
import { migrate } from './schema.js';

const pool = createPool();
await migrate(pool);
console.log('Esquema aplicado');
await pool.end();
