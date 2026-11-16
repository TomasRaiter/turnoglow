# Informe de pruebas — TurnoGlow

## Resumen

| Ítem | Resultado |
|------|-----------|
| Tests automatizados | **82** |
| Tests pasando | **82 / 82 (100 %)** |
| Reglas de negocio cubiertas | **22 / 22** (RN-01 a RN-22) |
| Herramientas | Vitest 5, Supertest, pg-mem (PostgreSQL en memoria) |
| Comando | `cd backend && npm test` |

## Estrategia

1. **Tests unitarios de reglas** (`tests/rules.test.js`): prueban las funciones puras de `src/rules.js`
   (horarios, bloques de 30 min, cierre, superposición, anticipación) sin base de datos.
2. **Tests de integración de la API** (resto de archivos): levantan la app Express completa con una base
   PostgreSQL en memoria (pg-mem) y hacen pedidos HTTP reales con Supertest. Cada test arranca con una
   base vacía, así que son independientes entre sí.
3. **Reloj controlado**: "ahora" se fija en el **lunes 2/3/2026 08:00 (UTC-3)** con `fixedClock`, y se
   adelanta con `clock.set()` para probar cancelaciones a menos de 24 h o turnos que ya pasaron.
4. **Pruebas manuales end-to-end** en el navegador contra el frontend (ver abajo).

Cada test que verifica una regla lleva su código (`RN-XX`) en el nombre y comprueba que la API
responda con ese código en el campo `rule` del error.

## Cobertura por regla

| Regla | Descripción corta | Tests | Archivo(s) |
|-------|-------------------|:----:|-----------|
| RN-01 | Email único / válido | 2 | auth |
| RN-02 | Contraseña ≥ 8 y hasheada | 2 | auth |
| RN-03 | Registro crea siempre `cliente` | 1 | auth |
| RN-04 | Sesión y rol requeridos | 5 | auth, services, cancel, blockedDays |
| RN-05 | Cada clienta ve/cancela solo lo suyo | 2 | cancel |
| RN-06 | Validación de servicio | 6 | services |
| RN-07 | Solo servicios activos | 3 | services, availability, booking |
| RN-08 | No eliminar servicio con turnos | 1 | services |
| RN-09 | Lunes a sábado 9 a 19 | 6 | rules, availability, booking |
| RN-10 | Bloques de 30 min | 2 | rules, booking |
| RN-11 | Terminar antes del cierre | 4 | rules, availability, booking |
| RN-12 | Sin superposición | 5 | rules, availability, booking, cancel |
| RN-13 | Días bloqueados | 4 | rules, availability, booking, blockedDays |
| RN-14 | No pasado, 2 h de anticipación | 4 | rules, availability, booking |
| RN-15 | Máximo 30 días | 3 | rules, availability, booking |
| RN-16 | Máximo 2 turnos futuros | 2 | booking |
| RN-17 | Bloqueo por 2 ausencias | 2 | booking, cancel |
| RN-18 | Cancelación de clienta hasta 24 h | 2 | cancel |
| RN-19 | Admin cancela siempre | 1 | cancel |
| RN-20 | Completado/ausente solo si ya empezó | 3 | cancel |
| RN-21 | Estados finales no cambian | 2 | cancel |
| RN-22 | No bloquear día con turnos | 2 | blockedDays |

## Tests por archivo

| Archivo | Tests | Qué prueba |
|---------|:----:|-----------|
| `health.test.js` | 2 | API levantada, reloj inyectado, 404 |
| `auth.test.js` | 8 | Registro, login, token, roles |
| `services.test.js` | 12 | ABM de servicios y validaciones |
| `rules.test.js` | 15 | Reglas de agenda como funciones puras |
| `availability.test.js` | 9 | Horarios libres por día y servicio |
| `booking.test.js` | 14 | Reserva y todas sus validaciones |
| `cancel.test.js` | 14 | Mis turnos, cancelación, estados, agenda |
| `blockedDays.test.js` | 6 | Días bloqueados |
| `seed.test.js` | 2 | Semilla idempotente de admin y servicios |

## Resultado de la última ejecución

```
 Test Files  9 passed (9)
      Tests  82 passed (82)
```

## Casos límite destacados

- Un turno de 60 min a las **09:00** es válido si otro empieza a las **10:00** (los extremos no se pisan).
- Reservar **exactamente 2 h** antes es válido; 1 h 30 min antes, no.
- Un servicio de 90 min no puede empezar a las 18:00 (terminaría 19:30) pero sí a las 17:30.
- Los turnos **cancelados** no cuentan para el límite de 2 ni ocupan horario.
- El email se compara sin mayúsculas: `ANA@mail.com` choca con `ana@mail.com`.
- Si la clienta manda `role: "admin"` al registrarse, se ignora.

## Pruebas manuales (end-to-end en el navegador)

| # | Paso | Resultado esperado | Resultado |
|---|------|-------------------|:---------:|
| 1 | Abrir la home sin sesión | Se listan los 6 servicios de ejemplo | ✅ |
| 2 | Crear cuenta nueva | Redirige a "Reservar" con la sesión iniciada | ✅ |
| 3 | Elegir "Kapping gel", fecha de mañana | Aparecen horarios 09:00 a 17:30 | ✅ |
| 4 | Elegir 10:00 y confirmar | Pantalla "¡Turno reservado!" | ✅ |
| 5 | Ir a "Mis turnos" | Aparece el turno en "Próximos" con botón Cancelar | ✅ |
| 6 | Ingresar como administradora | Redirige a la Agenda | ✅ |
| 7 | Avanzar la agenda al día del turno | Se ve el turno con nombre y email de la clienta | ✅ |
| 8 | Intentar bloquear ese día | Error "Ese día tiene 1 turno(s) confirmado(s)…" con etiqueta **RN-22** | ✅ |
| 9 | Recargar la página en una ruta interna (`/mis-turnos`) | No da 404 (redirect SPA configurado) | ✅ |

## Cómo reproducir

```bash
cd backend
npm install
npm test
```

No requiere base de datos ni variables de entorno: los tests usan PostgreSQL en memoria.
