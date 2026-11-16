// Reloj inyectable: la app nunca llama a `new Date()` directamente (AGENTS.md regla 8).
export const systemClock = { now: () => new Date() };

export function fixedClock(iso) {
  let current = new Date(iso);
  return {
    now: () => new Date(current),
    set: (newIso) => { current = new Date(newIso); },
  };
}
