# 💅 TurnoGlow

Aplicación web para **reservar turnos en un estudio de uñas y pestañas**. Las clientas se registran,
eligen un servicio, ven los horarios libres y reservan; la administradora gestiona la agenda,
los servicios y los días sin atención.

> No es un sitio estático: la API aplica **22 reglas de negocio numeradas** (horario de atención,
> bloques de 30 min, superposición, anticipación mínima y máxima, límite de turnos por clienta,
> bloqueo por ausencias, política de cancelación de 24 h, etc.). Ver [`docs/spec.md`](docs/spec.md).

## 🌐 Demo online

| | Link |
|--|------|
| Aplicación (frontend) | _pendiente de publicar_ |
| API (backend) | _pendiente de publicar_ |

> El backend está en el plan gratuito de Render: si estuvo inactivo, **la primera carga puede tardar ~50 segundos**.

**Para probar como administradora** pedir las credenciales al autor (no se publican en el repo).
Para probar como clienta, creá una cuenta desde "Ingresar → Creá una".

## 📚 Documentación

| Documento | Contenido |
|-----------|-----------|
| [`docs/spec.md`](docs/spec.md) | Especificación con reglas de negocio numeradas (RN-01 a RN-22), pantallas y API |
| [`docs/plan.md`](docs/plan.md) | Plan del proyecto: arquitectura, decisiones, etapas y riesgos |
| [`docs/tasks.md`](docs/tasks.md) | Tareas (una por commit) marcadas como hechas |
| [`docs/informe-pruebas.md`](docs/informe-pruebas.md) | Informe de pruebas: 82 tests, cobertura por regla y pruebas manuales |
| [`AGENTS.md`](AGENTS.md) | Reglas para agentes de IA que trabajen en el repo |

## 🧱 Stack

- **Frontend:** React 18 + Vite + React Router → Netlify
- **Backend:** Node.js + Express 5 + JWT + bcrypt → Render
- **Base de datos:** PostgreSQL → Neon
- **Tests:** Vitest + Supertest + pg-mem

```
backend/    API REST (src/rules.js = reglas de negocio puras)
frontend/   SPA en React
docs/       spec, plan, tareas, informe de pruebas
```

## 🖥️ Pantallas

1. Servicios (catálogo) · 2. Ingresar · 3. Crear cuenta · 4. Reservar turno (servicio → día → horario → confirmar)
5. Mis turnos (próximos + historial, cancelar) · 6. Admin: Agenda (cancelar, marcar completado/ausente)
7. Admin: Servicios (alta, edición, activar/desactivar, eliminar) · 8. Admin: Días bloqueados

## ▶️ Correr localmente

Requisitos: Node 20 o superior.

**Opción rápida (sin base de datos):** usa PostgreSQL en memoria con datos de ejemplo.

```bash
cd backend && npm install && npm run demo      # API en http://localhost:3000
cd frontend && npm install && npm run dev      # App en http://localhost:5173
```
Administradora de la demo local: `admin@demo.com` / `admin1234` (solo existe en memoria, en tu máquina).

**Con PostgreSQL real:**

```bash
cd backend
cp .env.example .env     # completar DATABASE_URL, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
npm install
npm run dev              # crea las tablas, la administradora y servicios de ejemplo
```

## ✅ Tests

```bash
cd backend && npm test
```
82 tests, todos pasando. No necesitan base de datos ni `.env`.

## 🚀 Despliegue

| Pieza | Servicio | Configuración |
|-------|----------|---------------|
| Base de datos | Neon | Crear proyecto y copiar el connection string |
| Backend | Render | Blueprint [`render.yaml`](render.yaml) · variables: `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` |
| Frontend | Netlify | [`netlify.toml`](netlify.toml) · variable: `VITE_API_URL` = URL del backend |

## 🔒 Secretos

Ninguna credencial está en el repositorio. El archivo `.env` está en `.gitignore`;
solo se versiona `.env.example` con valores de ejemplo. Los secretos de producción se cargan
en los paneles de Render y Netlify.

## Endpoints principales

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/register` · `/api/auth/login` | Registro e ingreso |
| GET | `/api/services` | Catálogo |
| GET | `/api/availability?serviceId=1&date=2026-03-03` | Horarios libres |
| POST | `/api/appointments` | Reservar `{ serviceId, date, time }` |
| GET | `/api/appointments/mine` | Mis turnos |
| POST | `/api/appointments/:id/cancel` | Cancelar |
| GET | `/api/admin/appointments?date=` | Agenda del día (admin) |
| POST | `/api/admin/appointments/:id/status` | Marcar completado / ausente (admin) |
| GET/POST/DELETE | `/api/blocked-days` | Días bloqueados |

Los errores devuelven `{ "error": "mensaje", "rule": "RN-XX" }` indicando la regla violada.
