import bcrypt from 'bcryptjs';

export const SAMPLE_SERVICES = [
  { name: 'Esmaltado semipermanente', description: 'Manos, limado y esmaltado que dura 3 semanas.', durationMin: 60, price: 9000 },
  { name: 'Kapping gel', description: 'Capa de gel sobre uña natural para fortalecerla.', durationMin: 90, price: 13000 },
  { name: 'Uñas esculpidas', description: 'Extensión en gel o acrílico con diseño simple.', durationMin: 120, price: 18000 },
  { name: 'Lifting de pestañas', description: 'Curvatura y tinte de pestañas naturales.', durationMin: 60, price: 15000 },
  { name: 'Extensiones pelo a pelo', description: 'Volumen clásico, primera colocación.', durationMin: 150, price: 25000 },
  { name: 'Perfilado de cejas', description: 'Diseño y depilación con hilo o cera.', durationMin: 30, price: 6000 },
];

/**
 * Crea la administradora (si no existe) y los servicios de ejemplo (si no hay ninguno).
 * Las credenciales vienen de variables de entorno: nunca se escriben en el repo.
 */
export async function seed(db, { adminEmail, adminPassword, adminName = 'Administradora' }) {
  if (adminEmail && adminPassword) {
    const { rows } = await db.query('SELECT id FROM users WHERE email = $1', [adminEmail.toLowerCase()]);
    if (!rows.length) {
      const hash = await bcrypt.hash(adminPassword, 10);
      await db.query("INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'admin')", [adminName, adminEmail.toLowerCase(), hash]);
      console.log(`Administradora creada: ${adminEmail}`);
    }
  }
  const { rows } = await db.query('SELECT COUNT(*)::int AS n FROM services');
  if (Number(rows[0].n) === 0) {
    for (const s of SAMPLE_SERVICES) {
      await db.query('INSERT INTO services (name, description, duration_min, price) VALUES ($1, $2, $3, $4)', [s.name, s.description, s.durationMin, s.price]);
    }
    console.log(`${SAMPLE_SERVICES.length} servicios de ejemplo creados`);
  }
}
