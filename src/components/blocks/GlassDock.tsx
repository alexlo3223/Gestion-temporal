import { type PointerEvent, type RefObject, useLayoutEffect, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import './GlassDock.css';

/* ══ Glass dock ═══════════════════════════════════════════
   Navegación inferior para móvil con aumento por distancia: el
   tamaño cae con la distancia al puntero en vez de aplicarse solo
   al elemento bajo él, que es lo que evita que parezca una fila de
   botones que casualmente crecen.

   ADAPTADO para la app: los elementos, el activo y qué pasa al
   elegir llegan por props (antes eran cinco fijos con estado propio).

   ── LA BARRA LEE EL PUNTERO, LOS ELEMENTOS NO ───────────
   Un toque queda capturado por el elemento donde empezó, así que
   deslizar el dedo por el dock enviaría todo al primer icono. Un
   único manejador en la barra calcula el elemento más cercano a la
   x del puntero, medido (no deducido del índice) porque con el
   aumento los elementos no miden lo mismo. */

export interface DockItem {
  key: string;
  label: string;
  Icon: LucideIcon;
}

export function GlassDock({
  items,
  active,
  onSelect,
  magnify = 1.32,
  spread = 2,
  lift = 8,
  labels = true,
}: {
  items: DockItem[];
  active: string;
  onSelect: (key: string) => void;
  magnify?: number;
  spread?: number;
  lift?: number;
  labels?: boolean;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const bar = useRef<HTMLElement | null>(null);
  const down = useRef(false);
  /* un dedo ya eligió al levantarse: el click que llega después (dirigido
     al elemento donde EMPEZÓ el toque) no debe deshacerlo */
  const chose = useRef(false);

  const at = (clientX: number) => {
    const els = bar.current?.querySelectorAll('.gdock-item');
    if (!els?.length) return null;
    let best = 0;
    let gap = Infinity;
    els.forEach((el, i) => {
      const b = el.getBoundingClientRect();
      const d = Math.abs(clientX - (b.left + b.width / 2));
      if (d < gap) {
        gap = d;
        best = i;
      }
    });
    return best;
  };

  const track = (e: PointerEvent) => {
    /* el ratón aumenta al pasar; el dedo tiene que estar apoyado, o un scroll lo activaría */
    if (e.pointerType !== 'mouse' && !down.current) return;
    setHover(at(e.clientX));
  };

  return (
    <nav
      className="gdock"
      aria-label="Navegación"
      ref={bar}
      /* fase de CAPTURA: cada elemento detiene pointerdown, así que un
         manejador en burbuja no se ejecutaría nunca */
      onPointerDownCapture={(e) => {
        down.current = true;
        chose.current = false;
        setHover(at(e.clientX));
      }}
      onPointerMoveCapture={track}
      onPointerUpCapture={(e) => {
        if (down.current && e.pointerType !== 'mouse') {
          const i = at(e.clientX);
          if (i !== null) {
            chose.current = true;
            if (items[i].key !== active) onSelect(items[i].key);
          }
        }
        down.current = false;
        if (e.pointerType !== 'mouse') setHover(null);
      }}
      onPointerCancelCapture={() => {
        down.current = false;
        setHover(null);
      }}
      onPointerLeave={() => {
        if (!down.current) setHover(null);
      }}
    >
      {items.map(({ key, label, Icon }, i) => {
        const d = hover === null ? 99 : Math.abs(i - hover);
        /* coseno elevado sobre el alcance: 1 bajo el puntero, 0 en el borde */
        const f = d > spread ? 0 : (1 + Math.cos((Math.PI * d) / (spread + 1))) / 2;
        const scale = 1 + (magnify - 1) * f;
        return (
          <button
            key={key}
            type="button"
            className="gdock-item"
            aria-label={label}
            aria-current={active === key ? 'page' : undefined}
            data-active={active === key}
            onClick={() => {
              if (chose.current) return;
              onSelect(key);
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {/* se aumenta el glifo, no el botón: así el punto no se mueve */}
            <span className="gdock-glyph" style={{ transform: `translateY(${-lift * f}px) scale(${scale})` }}>
              <Icon size={20} strokeWidth={2} />
            </span>
            <span className="gdock-dot" data-on={active === key} />
          </button>
        );
      })}
      {labels && <DockTip bar={bar} at={hover} items={items} />}
    </nav>
  );
}

/* ── UNA ETIQUETA QUE VIAJA ───────────────────────────────
   No una etiqueta por icono que se enciende y apaga, sino una píldora
   que se desliza hasta el icono bajo el puntero y cambia de ancho para
   la palabra nueva. Conserva la última palabra mientras se desvanece. */
function DockTip({ bar, at, items }: { bar: RefObject<HTMLElement | null>; at: number | null; items: DockItem[] }) {
  const [last, setLast] = useState(0);
  const [place, setPlace] = useState<{ x: number; w: number } | null>(null);
  const word = useRef<HTMLSpanElement>(null);
  const [ready, setReady] = useState(false);
  if (at !== null && at !== last) setLast(at);

  useLayoutEffect(() => {
    const nav = bar.current;
    const item = nav?.querySelectorAll<HTMLElement>('.gdock-item')[last];
    const text = word.current;
    if (!nav || !item || !text) return;
    const w = Math.ceil(text.scrollWidth) + 24;
    setPlace({ x: item.offsetLeft + item.offsetWidth / 2 - w / 2, w });
  }, [last, bar]);
  useLayoutEffect(() => {
    if (!place || ready) return;
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, [place, ready]);

  return (
    <span
      className="gdock-tip"
      aria-hidden="true"
      data-on={at !== null && !!place}
      data-ready={ready || undefined}
      style={place ? { width: place.w, transform: `translateX(${place.x}px)` } : undefined}
    >
      <span ref={word}>{items[last]?.label}</span>
    </span>
  );
}
