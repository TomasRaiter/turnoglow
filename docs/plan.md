# Plan del proyecto — TurnoGlow

## Objetivo
Construir y publicar una aplicación de reserva de turnos para un estudio de uñas y pestañas
que aplique reglas de negocio reales (horarios, superposición, anticipación, límites por clienta,
política de cancelación y ausencias), según [`spec.md`](spec.md).

## Arquitectura

```
[Navegador] ──► Frontend React (Netlify)
                     │  fetch JSON + JWT
                     ▼
              API Node/Express (Render)
                     │  SQL (pg)
                     ▼
              PostgreSQL (Neon)
```

| Capa | Tecnología | Hosting |
|------|-----------|---------|
| Frontend | React 18 + Vite + React Router | Netlify |
| Backend | Node 20+, Express, bcryptjs, jsonwebtoken, pg | Render (Web Service) |
| Base de datos | PostgreSQL | Neon |
| Tests | Vitest + Supertest + pg-mem (Postgres en memoria) | local / CI |

### Decisiones
- **Reglas en funciones puras** (`backend/src/rules.js`): se testean sin base de datos.
- **Reloj inyectable** (`clock.js`): los tests fijan "ahora" para probar anticipación y cancelaciones.
- **pg-mem** para tests de integración de la API: corren sin Postgres real ni secretos.
- **Zona horaria fija UTC-3** (Argentina no tiene horario de verano).
- **Superposición**: se valida en el servicio dentro de una transacción antes de insertar.

## Etapas
1. Documentación: spec numerada, AGENTS.md, plan y tareas.
2. Backend: estructura, esquema, autenticación, servicios, disponibilidad, reservas, cancelaciones, días bloqueados.
3. Frontend: login/registro, catálogo, reservar, mis turnos, panel admin.
4. Calidad: informe de pruebas, README.
5. Despliegue: Neon → Render → Netlify, y links en el README.

## Riesgos
| Riesgo | Mitigación |
|--------|-----------|
| Render free "duerme" el servicio | Se avisa en el README que la primera carga puede tardar ~50 s. |
| Diferencias pg-mem vs Postgres | SQL simple y estándar; prueba manual contra Neon. |
| Filtrar secretos | `.env` en `.gitignore`, `.env.example` sin valores reales. |

## Tareas
Ver [`tasks.md`](tasks.md).
