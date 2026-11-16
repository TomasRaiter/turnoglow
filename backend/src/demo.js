// Servidor de demo con PostgreSQL en memoria (pg-mem): no necesita base ni .env.
// Uso: npm run demo   → admin: admin@demo.com / admin1234 (solo local, datos efímeros)
import { newDb } from 'pg-mem';
import { createApp } from './app.js';
import { schemaSql } from './db/schema.js';
import { seed } from './db/seedData.js';

const mem = newDb();
mem.public.none(schemaSql);
const { Pool } = mem.adapters.createPg();
const db = new Pool();
await seed(db, { adminEmail: 'admin@demo.com', adminPassword: 'admin1234' });
const app = createApp({ db, jwtSecret: 'solo-para-demo-local' });
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Demo en memoria: http://localhost:${port}/api/health`));
