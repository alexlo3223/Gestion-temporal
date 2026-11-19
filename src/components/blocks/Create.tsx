import { type CSSProperties, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, type LucideIcon } from 'lucide-react';
import './Create.css';

/* ══ Create ═══════════════════════════════════════════════
   Una sola forma, sin filtro: la píldora se hunde al pulsarla y se
   extiende en un menú mientras el hundimiento aún corre, así nunca hay
   un fotograma quieto. El ancho de la píldora se mide de su etiqueta.

   ADAPTADO para la app: las opciones y qué hacen llegan por props (antes
   eran cuatro fijas de demostración), el alto del panel sale del número
   de opciones, se ancla a la derecha (vive en la cabecera), Escape lo
   cierra y al abrir el foco pasa a la primera opción. */

/* el líquido sin rebote: un muelle que se pasa arrastraría también el
   radio de las esquinas, y eso se ve como un temblor */
const LIQUID_STILL = { type: 'spring' as const, stiffness: 420, damping: 30, mass: 0.5 };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

const CRT_CORNER = 20;
const CRT_MAX = 40;
const PANEL_W = 212;
const ROW_H = 34;
const ROW_GAP = 4;
const PANEL_PAD = 8;

export interface CreateItem {
  label: string;
  Icon: LucideIcon;
  onSelect: () => void;
}

export function Create({ items, label = 'Crear', corner = CRT_CORNER }: { items: CreateItem[]; label?: string; corner?: number }) {
  const [open, setOpen] = useState(false);
  const [sink, setSink] = useState(false);
  const stage = useRef<HTMLDivElement | null>(null);
  const say = useRef<HTMLSpanElement | null>(null);
  const beat = useRef(0);

  const [sayW, setSayW] = useState(44);
  /* se mide dos veces: ahora y cuando la fuente real ha cargado
     (offsetWidth redondea hacia abajo, de ahí el +1) */
  useLayoutEffect(() => {
    const el = say.current;
    if (!el) return;
    let live = true;
    const measure = () => {
      if (live) setSayW(el.offsetWidth + 1);
    };
    measure();
    document.fonts?.ready.then(measure).catch(() => {});
    return () => {
      live = false;
    };
  }, [label]);

  useEffect(() => () => window.clearTimeout(beat.current), []);

  /* abierto: pulsar fuera del panel visible o Escape lo cierran; el foco va a la primera opción */
  useEffect(() => {
    if (!open) return;
    stage.current?.querySelector<HTMLButtonElement>('.crt-item button')?.focus();
    const away = (e: PointerEvent) => {
      if (!e.isTrusted) return;
      const box = stage.current?.querySelector('.crt-panel')?.getBoundingClientRect();
      const inside = !!box && e.clientX >= box.left && e.clientX <= box.right && e.clientY >= box.top && e.clientY <= box.bottom;
      if (!inside) setOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      stage.current?.querySelector<HTMLButtonElement>('.crt-pill')?.focus();
    };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', key);
    };
  }, [open]);

  const press = () => {
    setSink(true);
    window.clearTimeout(beat.current);
    /* 60 ms de relevo contra 120 ms de hundimiento: se abre mientras aún se hunde */
    beat.current = window.setTimeout(() => {
      setSink(false);
      setOpen(true);
    }, 60);
  };

  /* glifo + hueco + etiqueta + el relleno a cada lado */
  const pillW = 18 + 8 + sayW + 34;
  const panelH = PANEL_PAD * 2 + items.length * ROW_H + (items.length - 1) * ROW_GAP;
  const panelR = clamp(corner, 0, CRT_MAX);
  const shutR = Math.min(19, panelR * (19 / CRT_CORNER));

  return (
    <div
      ref={stage}
      className="crt-stage"
      data-open={open || undefined}
      data-sink={sink || undefined}
      style={
        {
          '--pill-w': `${pillW}px`,
          '--crt-panel-w': `${PANEL_W}px`,
          '--crt-panel-h': `${panelH}px`,
          '--crt-row-r': `${Math.min(ROW_H / 2, Math.max(0, panelR - 10)).toFixed(2)}px`,
        } as CSSProperties
      }
    >
      <div className="crt-blobs" aria-hidden="true">
        <motion.div
          className="crt-body"
          initial={false}
          animate={{ width: open ? PANEL_W : pillW, height: open ? panelH : 38, borderRadius: open ? panelR : shutR }}
          transition={LIQUID_STILL}
        />
      </div>

      <button type="button" className="crt-pill" onClick={press} aria-expanded={open} aria-haspopup="menu" tabIndex={open ? -1 : 0}>
        <span className="crt-glyph" aria-hidden="true">
          <Plus size={16} strokeWidth={2} />
        </span>
        <span className="crt-say" style={{ width: sayW || undefined }}>
          <span ref={say}>{label}</span>
        </span>
      </button>

      <div className="crt-panel" role="menu" aria-label={label} aria-hidden={!open}>
        <ul className="crt-menu">
          {items.map((it, i) => (
            <li className="crt-item" key={it.label} style={{ transitionDelay: open ? `${30 + i * 22}ms` : '0ms' }}>
              <button
                type="button"
                role="menuitem"
                tabIndex={open ? 0 : -1}
                onClick={() => {
                  setOpen(false);
                  it.onSelect();
                }}
              >
                <it.Icon size={16} strokeWidth={2} aria-hidden="true" />
                {it.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
