/** Preferencia del sistema de reducir movimiento. Se lee una vez: es una preferencia, no una entrada en vivo. */
export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
