import { type RefObject, useLayoutEffect, useState } from 'react';

/** Ancho del elemento, actualizado al redimensionarse. `fallback` se usa hasta medirlo (y en tests). */
export function useElementWidth(ref: RefObject<HTMLElement | null>, fallback: number) {
  const [width, setWidth] = useState(fallback);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      const next = Math.round(entry.contentRect.width);
      if (next > 0) setWidth(next);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}
