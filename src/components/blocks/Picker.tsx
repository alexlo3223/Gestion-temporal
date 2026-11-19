import { type CSSProperties, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';
import './Picker.css';

/* ══ Picker ═══════════════════════════════════════════════
   Una píldora que abre una lista y se llena de "caras" según eliges.
   Una, dos, cuatro: la píldora crece para alojarlas y se solapan en
   una pila en vez de una fila.

   ADAPTADO para la app: las opciones llegan por props (antes era un
   reparto de personas con fotos) y cada cara es un disco del color de
   la opción con su inicial. Es controlado (selected/onChange), se
   cierra al pulsar fuera o con Escape — el original no lo hacía por
   ser una demo en un muro de componentes — y a partir de 4 caras
   muestra "+N".

   LA PÍLDORA ES LA LECTURA: no hay contador ni "3 seleccionadas";
   las caras dicen cuáles, que es lo que uno quiere comprobar. */

export interface PickerOption {
  id: string;
  label: string;
  sub?: string;
  color: string;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

const FACE = 28;
const MAX_FACES = 4;

/* ── la otra forma de apilar: cuatro en el hueco de una ── */
const quad = (n: number, gut: number) => {
  const cell = (FACE - gut) / 2;
  const s = cell / FACE;
  const a = cell / 2;
  const b = FACE - cell / 2;
  const m = FACE / 2;
  if (n <= 1) return [{ cx: m, cy: m, s: 1 }];
  if (n === 2) return [{ cx: a, cy: m, s }, { cx: b, cy: m, s }];
  if (n === 3) return [{ cx: a, cy: a, s }, { cx: b, cy: a, s }, { cx: a, cy: b, s }];
  return [{ cx: a, cy: a, s }, { cx: b, cy: a, s }, { cx: a, cy: b, s }, { cx: b, cy: b, s }];
};

const initial = (label: string) => label.trim().charAt(0).toUpperCase();

export function Picker({
  options,
  selected,
  onChange,
  label,
  emptyLabel = 'Todas',
  corner = 20,
  overlap = 10,
  stack = 'Row',
}: {
  options: PickerOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  /** Nombre accesible del control. */
  label: string;
  /** Lo que dice la píldora sin nada elegido. */
  emptyLabel?: string;
  corner?: number;
  overlap?: number;
  stack?: 'Row' | 'Grid';
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement | null>(null);

  const r = clamp(corner, 0, 26);
  const lap = clamp(overlap, 0, 22);
  const grid = stack === 'Grid';
  const picked = selected.filter((id) => options.some((o) => o.id === id));
  const faces = picked.slice(0, MAX_FACES);
  const extra = picked.length - faces.length;
  const spots = quad(faces.length, 4 - (lap / 22) * 2);

  /* el ancho se CALCULA a partir del número de caras, no se mide */
  const rail = !faces.length ? 0 : grid ? FACE : FACE + (faces.length - 1) * (FACE - lap);

  /* en una app real, pulsar fuera o Escape lo cierran */
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', key);
    };
  }, [open]);

  const toggle = (id: string) => onChange(picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id]);
  const byId = (id: string) => options.find((o) => o.id === id);

  return (
    <div ref={root} className="pik" style={{ '--pik-row-r': `${Math.max(0, r - 6)}px` } as CSSProperties}>
      <button
        type="button"
        className="pik-pill"
        style={{ borderRadius: r }}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`${label}: ${picked.length ? picked.map((id) => byId(id)?.label).join(', ') : emptyLabel}`}
      >
        <span className="pik-rail" style={{ width: rail }}>
          <AnimatePresence initial={false}>
            {faces.map((id, i) => {
              const option = byId(id);
              const spot = grid ? spots[Math.min(i, spots.length - 1)] : null;
              const tx = spot ? spot.cx - FACE / 2 : i * (FACE - lap);
              const ty = spot ? spot.cy - FACE / 2 : 0;
              const sc = spot ? spot.s : 1;
              return (
                <motion.span
                  key={id}
                  className="pik-face"
                  style={{ zIndex: MAX_FACES - i, background: option?.color }}
                  /* una cara se POSA: cae con un giro y se pasa un poco al llegar */
                  initial={{ scale: 0.2 * sc, opacity: 0, x: tx, y: ty - 10, rotate: -22 }}
                  animate={{ scale: sc, opacity: 1, x: tx, y: ty, rotate: 0 }}
                  exit={{ scale: 0.2 * sc, opacity: 0, x: tx, y: ty - 6, rotate: 14 }}
                  transition={{
                    type: 'spring',
                    stiffness: 500,
                    damping: 18,
                    mass: 0.8,
                    x: { type: 'spring', stiffness: 380, damping: 34, mass: 0.7 },
                    y: { type: 'spring', stiffness: 380, damping: 34, mass: 0.7 },
                    scale: { type: 'spring', stiffness: 380, damping: 34, mass: 0.7 },
                    opacity: { duration: 0.16 },
                  }}
                >
                  {option && initial(option.label)}
                </motion.span>
              );
            })}
          </AnimatePresence>
        </span>
        {extra > 0 && <span className="pik-more">+{extra}</span>}
        {picked.length === 0 && <span className="pik-say">{emptyLabel}</span>}
        <ChevronDown className="pik-chev" size={16} strokeWidth={2} aria-hidden="true" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="pik-card"
            style={{ borderRadius: r }}
            role="listbox"
            aria-label={label}
            aria-multiselectable="true"
            /* se despliega DESDE la píldora: el origen es su esquina */
            initial={{ opacity: 0, y: -10, scaleX: 0.86, scaleY: 0.72 }}
            animate={{ opacity: 1, y: 0, scaleX: 1, scaleY: 1 }}
            exit={{ opacity: 0, y: -8, scaleX: 0.92, scaleY: 0.86 }}
            transition={{ type: 'spring', stiffness: 500, damping: 18, mass: 0.9, opacity: { duration: 0.16 } }}
          >
            {options.map((p, index) => {
              const on = picked.includes(p.id);
              return (
                <motion.button
                  key={p.id}
                  type="button"
                  className="pik-row"
                  role="option"
                  aria-selected={on}
                  data-on={on || undefined}
                  onClick={() => toggle(p.id)}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 34, mass: 0.7, delay: 0.04 * index + 0.03 }}
                >
                  <span className="pik-av" style={{ background: p.color }} aria-hidden="true">
                    {initial(p.label)}
                  </span>
                  <span className="pik-who">
                    <span className="pik-name">{p.label}</span>
                    {p.sub && <span className="pik-role">{p.sub}</span>}
                  </span>
                  {/* la caja siempre está; solo llega la marca */}
                  <span className="pik-mark">
                    <AnimatePresence initial={false}>
                      {on && (
                        <motion.span
                          className="pik-tick"
                          initial={{ scale: 0.4, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.4, opacity: 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 18, mass: 0.6 }}
                        >
                          <Check size={14} strokeWidth={2} />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </span>
                </motion.button>
              );
            })}
            {picked.length > 0 && (
              <button type="button" className="pik-clear" onClick={() => onChange([])}>
                Mostrar todas
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
