# AGENTS.md — Reglas para agentes de IA

Este archivo indica cómo debe trabajar cualquier agente (Claude, Codex, Copilot, etc.) en este repositorio.

## Contexto
- Proyecto: **TurnoGlow**, reservas de turnos para un estudio de uñas y pestañas.
- La fuente de verdad de las reglas es [`docs/spec.md`](docs/spec.md). Cada regla tiene un código `RN-XX`.
- El plan está en [`docs/plan.md`](docs/plan.md) y las tareas en [`docs/tasks.md`](docs/tasks.md).

## Reglas de trabajo
1. **Leer la spec antes de tocar código.** Si un cambio no está cubierto por una regla, primero se agrega o modifica la regla en `docs/spec.md`.
2. **Una tarea = un commit.** El mensaje empieza con el código de la tarea: `T06: reserva de turnos con reglas RN-09..RN-17`.
3. **Marcar la tarea como hecha** (`[x]`) en `docs/tasks.md` dentro del mismo commit.
4. **Toda regla de negocio tiene al menos un test** cuyo nombre incluye el código `RN-XX`.
5. **Todos los tests deben pasar** (`cd backend && npm test`) antes de commitear.
6. **Nada de secretos en el repo.** Las credenciales van en `.env` (ignorado por git). Solo se versiona `.env.example`.
7. Las reglas de negocio viven en `backend/src/rules.js` (funciones puras, sin acceso a base de datos) para poder testearlas sin red.
8. La hora del sistema se obtiene siempre de `clock.now()` para poder simular fechas en los tests.
9. No cambiar el esquema de la base sin actualizar `backend/src/db/schema.sql`.
10. Código y mensajes al usuario en español. Nombres de variables en inglés.

## Comandos
```bash
cd backend && npm install && npm test      # tests
cd backend && npm run dev                   # API local (puerto 3000)
cd frontend && npm install && npm run dev   # front local (puerto 5173)
```

## Estructura
```
backend/   API Express + PostgreSQL
frontend/  React + Vite
docs/      spec, plan, tareas, informe de pruebas
```
