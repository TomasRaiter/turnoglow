import { createApp } from './app.js';
import { createPool } from './db/pool.js';
import { migrate } from './db/schema.js';

const db = createPool();
await migrate(db);
const app = createApp({ db });
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`TurnoGlow API escuchando en puerto ${port}`));
