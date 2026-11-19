/** Identificador único. `randomUUID` solo existe en contextos seguros (https, localhost). */
export function createId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
