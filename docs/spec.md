# Especificación — TurnoGlow

TurnoGlow es una aplicación web para reservar turnos en un estudio de uñas y pestañas
atendido por **una sola profesional**. Las clientas se registran, eligen un servicio,
ven los horarios libres y reservan. La administradora gestiona servicios, agenda y
días no laborables.

## Actores

| Actor | Descripción |
|-------|-------------|
| Clienta | Persona registrada que reserva y cancela sus turnos. |
| Administradora | Dueña del estudio. Gestiona servicios, agenda, días bloqueados y estados de los turnos. |

## Entidades

- **Usuario**: id, nombre, email, contraseña (hash), rol (`cliente` / `admin`), fecha de alta.
- **Servicio**: id, nombre, descripción, duración en minutos, precio, activo.
- **Turno**: id, usuario, servicio, inicio, fin, estado (`confirmado`, `cancelado`, `completado`, `ausente`), fecha de creación.
- **Día bloqueado**: fecha, motivo.

## Reglas de negocio

Todas las horas se expresan en la zona horaria del estudio: **America/Argentina/Buenos_Aires (UTC-3)**.

### Cuentas y acceso
- **RN-01** — El email es único. No se puede registrar dos usuarios con el mismo email (se compara sin distinguir mayúsculas).
- **RN-02** — La contraseña debe tener al menos 8 caracteres y se guarda solo como hash (nunca en texto plano).
- **RN-03** — Todo usuario que se registra desde la app tiene rol `cliente`. El rol `admin` solo se crea por script/semilla.
- **RN-04** — Las operaciones de reserva requieren sesión iniciada (token JWT). Las de administración requieren rol `admin`.
- **RN-05** — Una clienta solo puede ver y cancelar sus propios turnos.

### Servicios
- **RN-06** — Un servicio tiene nombre obligatorio, duración múltiplo de 30 entre 30 y 240 minutos, y precio mayor a 0.
- **RN-07** — Solo los servicios activos se muestran a las clientas y pueden reservarse.
- **RN-08** — Un servicio que tiene turnos asociados (de cualquier estado, para conservar el historial) no se puede eliminar; solo se puede desactivar.

### Agenda y disponibilidad
- **RN-09** — El estudio atiende de **lunes a sábado de 09:00 a 19:00**. Domingo cerrado.
- **RN-10** — Los turnos empiezan en bloques de 30 minutos (09:00, 09:30, …).
- **RN-11** — Un turno debe terminar como máximo a las 19:00 (inicio + duración del servicio ≤ cierre).
- **RN-12** — Dos turnos confirmados no pueden superponerse (hay una sola profesional).
- **RN-13** — No se puede reservar en días bloqueados por la administradora (feriados, vacaciones).
- **RN-14** — No se puede reservar en el pasado y se exige una anticipación mínima de **2 horas**.
- **RN-15** — No se puede reservar con más de **30 días** de anticipación.

### Límites de la clienta
- **RN-16** — Una clienta puede tener como máximo **2 turnos futuros confirmados** a la vez.
- **RN-17** — Una clienta con **2 o más ausencias** (`ausente`) queda inhabilitada para reservar online.

### Cancelaciones y estados
- **RN-18** — La clienta puede cancelar un turno confirmado hasta **24 horas antes** del inicio. Después, solo la administradora puede cancelarlo.
- **RN-19** — La administradora puede cancelar cualquier turno confirmado en cualquier momento.
- **RN-20** — Solo un turno `confirmado` cuyo inicio ya pasó puede marcarse como `completado` o `ausente`.
- **RN-21** — Un turno cancelado, completado o ausente no cambia más de estado.
- **RN-22** — No se puede bloquear un día que ya tiene turnos confirmados (primero hay que cancelarlos).

## Pantallas

1. Ingresar (login)
2. Crear cuenta (registro)
3. Servicios (catálogo)
4. Reservar turno (elegir servicio → fecha → horario libre → confirmar)
5. Mis turnos (próximos e historial, con botón cancelar)
6. Admin · Agenda (turnos por día, cancelar, marcar completado/ausente)
7. Admin · Servicios (alta, edición, activar/desactivar, eliminar)
8. Admin · Días bloqueados (alta y baja)

## API (resumen)

| Método | Ruta | Acceso | Reglas |
|--------|------|--------|--------|
| POST | /api/auth/register | público | RN-01, RN-02, RN-03 |
| POST | /api/auth/login | público | — |
| GET | /api/auth/me | sesión | RN-04 |
| GET | /api/services | público | RN-07 |
| GET | /api/services/all | admin | — |
| POST | /api/services | admin | RN-06 |
| PUT | /api/services/:id | admin | RN-06 |
| DELETE | /api/services/:id | admin | RN-08 |
| GET | /api/availability?serviceId&date | público | RN-09..RN-15 |
| POST | /api/appointments | clienta | RN-07, RN-09..RN-17 |
| GET | /api/appointments/mine | sesión | RN-05 |
| POST | /api/appointments/:id/cancel | sesión | RN-05, RN-18, RN-19, RN-21 |
| GET | /api/admin/appointments?date | admin | — |
| POST | /api/admin/appointments/:id/status | admin | RN-20, RN-21 |
| GET | /api/blocked-days | público | — |
| POST | /api/blocked-days | admin | RN-22 |
| DELETE | /api/blocked-days/:date | admin | — |
