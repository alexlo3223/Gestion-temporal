/** Sacude un elemento en horizontal para señalar un error (p. ej. un campo que no valida). Respeta «reducir movimiento». */
export function shake(el: Element | null | undefined) {
  if (!el || typeof el.animate !== 'function') return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  el.animate(
    [{ transform: 'translateX(0)' }, { transform: 'translateX(-7px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(3px)' }, { transform: 'translateX(0)' }],
    { duration: 380, easing: 'ease-in-out' },
  );
}
