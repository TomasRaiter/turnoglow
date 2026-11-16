import { createApp } from './app.js';
import { createPool } from './db/pool.js';
import { migrate } from './db/schema.js';
import { seed } from './db/seedData.js';

const db = createPool();
await migrate(db);
// Si están definidas ADMIN_EMAIL/ADMIN_PASSWORD crea la administradora y servicios de ejemplo (idempotente).
await seed(db, { adminEmail: process.env.ADMIN_EMAIL, adminPassword: process.env.ADMIN_PASSWORD });
const app = createApp({ db });
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`TurnoGlow API escuchando en puerto ${port}`));
