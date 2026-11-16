// Tests unitarios de las reglas de agenda (funciones puras, sin base de datos).
import { describe, it, expect } from 'vitest';
import { availableSlots, checkSlot, daySlots, isValidDate, localParts, toInstant } from '../src/rules.js';

// "Ahora": lunes 2 de marzo de 2026, 08:00 hora Argentina.
const now = toInstant('2026-03-02', '08:00');
const check = (date, time, durationMin = 60, extra = {}) =>
  checkSlot({ start: toInstant(date, time), durationMin, now, ...extra });

describe('Utilidades de fecha', () => {
  it('convierte hora local del estudio (UTC-3) a instante y vuelta', () => {
    const d = toInstant('2026-03-03', '09:00');
    expect(d.toISOString()).toBe('2026-03-03T12:00:00.000Z');
    expect(localParts(d)).toEqual({ date: '2026-03-03', time: '09:00', weekday: 2 });
  });

  it('valida fechas', () => {
    expect(isValidDate('2026-02-30')).toBe(false);
    expect(isValidDate('2026-03-03')).toBe(true);
    expect(isValidDate('03/03/2026')).toBe(false);
  });
});

describe('Reglas de agenda', () => {
  it('acepta un horario válido', () => {
    expect(check('2026-03-03', '10:00')).toBeNull();
  });

  it('RN-09: domingo cerrado', () => {
    expect(check('2026-03-08', '10:00').rule).toBe('RN-09');
  });

  it('RN-09: fuera del horario de atención', () => {
    expect(check('2026-03-03', '08:30').rule).toBe('RN-09');
    expect(check('2026-03-03', '19:00').rule).toBe('RN-09');
  });

  it('RN-09: el sábado se atiende', () => {
    expect(check('2026-03-07', '10:00')).toBeNull();
  });

  it('RN-10: los turnos empiezan en bloques de 30 minutos', () => {
    expect(check('2026-03-03', '10:15').rule).toBe('RN-10');
    expect(check('2026-03-03', '10:30')).toBeNull();
  });

  it('RN-11: el turno debe terminar a las 19:00 como máximo', () => {
    expect(check('2026-03-03', '18:00', 90).rule).toBe('RN-11');
    expect(check('2026-03-03', '17:30', 90)).toBeNull();
  });

  it('RN-11: daySlots respeta la duración', () => {
    const slots = daySlots(120);
    expect(slots[0]).toBe('09:00');
    expect(slots.at(-1)).toBe('17:00');
  });

  it('RN-12: no se superpone con otro turno confirmado', () => {
    const busy = [{ start: toInstant('2026-03-03', '10:00'), end: toInstant('2026-03-03', '11:00') }];
    expect(check('2026-03-03', '10:30', 60, { busy }).rule).toBe('RN-12');
    expect(check('2026-03-03', '09:30', 60, { busy }).rule).toBe('RN-12');
    expect(check('2026-03-03', '09:00', 60, { busy })).toBeNull(); // termina justo 10:00
    expect(check('2026-03-03', '11:00', 60, { busy })).toBeNull(); // empieza justo 11:00
  });

  it('RN-13: día bloqueado', () => {
    expect(check('2026-03-03', '10:00', 60, { blocked: true }).rule).toBe('RN-13');
  });

  it('RN-14: no se reserva en el pasado', () => {
    expect(check('2026-03-01', '10:00').rule).toBe('RN-14');
  });

  it('RN-14: anticipación mínima de 2 horas', () => {
    expect(check('2026-03-02', '09:30').rule).toBe('RN-14'); // 1:30 h después
    expect(check('2026-03-02', '10:00')).toBeNull(); // exactamente 2 h
  });

  it('RN-15: máximo 30 días de anticipación', () => {
    expect(check('2026-03-31', '18:00')).toBeNull(); // dentro de los 30 días
    expect(check('2026-04-01', '09:00').rule).toBe('RN-15'); // 30 días + 1 h
  });

  it('availableSlots descarta ocupados y los de menos de 2 h', () => {
    const busy = [{ start: toInstant('2026-03-02', '12:00'), end: toInstant('2026-03-02', '13:00') }];
    const slots = availableSlots({ date: '2026-03-02', durationMin: 60, now, busy });
    expect(slots[0]).toBe('10:00');
    expect(slots).not.toContain('11:30');
    expect(slots).not.toContain('12:00');
    expect(slots).toContain('13:00');
    expect(slots.at(-1)).toBe('18:00');
  });
});
