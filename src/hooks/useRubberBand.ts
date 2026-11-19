import { type RefObject, useEffect } from 'react';

/** Curva de goma: cuanto más se tira, menos cede (tiende a `max`). */
export const rubber = (distance: number, max: number, stiffness = 0.55) => max * (1 - 1 / ((distance * stiffness) / max + 1));

/**
 * Resistencia elástica al seguir arrastrando con el dedo más allá del principio o el final de un carrusel horizontal:
 * el contenido cede un poco, cada vez más duro, y vuelve con un muelle al soltar. Solo actúa con tacto.
 * Hay que ponerle al contenedor `overscroll-behavior-x: contain` para que la página no se lleve el gesto.
 */
export function useRubberBand(ref: RefObject<HTMLElement | null>, { max = 64 } = {}) {
  useEffect(() => {
    const scroller = ref.current;
    const content = scroller?.firstElementChild as HTMLElement | null | undefined;
    if (!scroller || !content) return;
    let last = 0;
    let pulled = 0; // desplazamiento bruto del dedo más allá del borde; el signo dice por cuál

    const apply = (animated: boolean) => {
      content.style.transition = animated ? 'transform 0.5s cubic-bezier(0.2, 0.9, 0.25, 1)' : 'none';
      content.style.transform = pulled ? `translateX(${Math.sign(pulled) * rubber(Math.abs(pulled), max)}px)` : '';
    };
    const onStart = (e: TouchEvent) => {
      last = e.touches[0].clientX;
      pulled = 0;
      content.style.transition = 'none';
    };
    const onMove = (e: TouchEvent) => {
      const x = e.touches[0].clientX;
      const step = x - last;
      last = x;
      const end = scroller.scrollWidth - scroller.clientWidth - 1;
      const outward = (scroller.scrollLeft <= 0 && step > 0) || (scroller.scrollLeft >= end && step < 0);
      if (pulled === 0 && !outward) return;
      const next = pulled + step;
      pulled = Math.sign(next) === Math.sign(pulled) || pulled === 0 ? next : 0; // al volver sobre sus pasos, suelta el borde
      apply(false);
    };
    const onEnd = () => {
      if (pulled === 0) return;
      pulled = 0;
      apply(true);
    };

    scroller.addEventListener('touchstart', onStart, { passive: true });
    scroller.addEventListener('touchmove', onMove, { passive: true });
    scroller.addEventListener('touchend', onEnd);
    scroller.addEventListener('touchcancel', onEnd);
    return () => {
      scroller.removeEventListener('touchstart', onStart);
      scroller.removeEventListener('touchmove', onMove);
      scroller.removeEventListener('touchend', onEnd);
      scroller.removeEventListener('touchcancel', onEnd);
    };
  }, [ref, max]);
}
