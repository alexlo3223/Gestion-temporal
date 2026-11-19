import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { prefersReducedMotion } from '../../lib/motion';
import './ActionNode.css';

/* ══ Action node ══════════════════════════════════════════
   Una tarjeta con sus acciones plegadas dentro de la esquina hasta
   que las quieres.

   ADAPTADO para la app: título, descripción, icono, pie y acciones
   llegan por props (antes era un "Node 07" de demostración con caras),
   y el abanico también se abre con el teclado: al enfocar la tarjeta
   sus botones pasan a ser tabulables.

   ── THEY COME OUT OF THE CORNER, THEY DO NOT ARRIVE AT IT ─
   Los botones se dibujan sobre un camino paralelo al contorno de la
   propia tarjeta, salen DE la esquina sin tamaño y viajan hacia fuera,
   así se ve de dónde vienen y a qué pertenecen.

   ── ONE SPRING EACH, AND THE STAGGER IS A DELAY ON THE TARGET ─
   Cuatro muelles, siempre (los hooks no pueden ser condicionales).
   Cada uno recibe la orden de abrirse un instante después del
   anterior; al cerrar va al revés, el último sale primero. */

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/* 0..100 → rigidez y decaimiento de un muelle (por amortiguamiento):
   0 ≈ ζ 0.85, pesado y sin rebote · 50 ≈ ζ 0.41 · 100 ≈ ζ 0.20, vivo */
const springOf = (tune: number) => ({
  k: 0.08 + (tune / 100) * 0.16,
  d: 0.62 + (tune / 100) * 0.2,
});

/* El umbral de reposo es absoluto, así que se trabaja en 0..100, no en 0..1 */
function useSpring(target: number, tune = 50, instant = false) {
  const [at, setAt] = useState(target);
  const cur = useRef(target);
  const vel = useRef(0);
  const raf = useRef(0);

  useEffect(() => {
    if (instant) {
      cur.current = target;
      vel.current = 0;
      setAt(target);
      return;
    }
    const { k, d } = springOf(tune);
    let prev = 0;
    const tick = (t: number) => {
      const dt = prev ? clamp((t - prev) / 16.67, 0, 2.5) : 1;
      prev = t;
      vel.current += (target - cur.current) * k * dt;
      vel.current *= Math.pow(d, dt);
      cur.current += vel.current * dt;
      if (Math.abs(target - cur.current) < 0.02 && Math.abs(vel.current) < 0.02) {
        cur.current = target;
        vel.current = 0;
        setAt(target);
        raf.current = 0;
        return;
      }
      setAt(cur.current);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf.current);
      raf.current = 0;
    };
  }, [target, tune, instant]);

  return at;
}

/* el botón, y medio botón. Todo lo demás con tamaño se mide a partir de aquí */
const DOT = 36;
const R = DOT / 2;
/* de centro a centro a lo largo del camino */
const SPACING = DOT + 12;

/* ── siguen la PROPIA esquina de la tarjeta, desplazada ────
   El camino es el contorno de la tarjeta empujado hacia fuera una
   distancia constante: recto por arriba, un arco concéntrico con la
   esquina y recto por la derecha. `s` es la longitud de arco desde
   donde el arco toca el borde superior. */
function ride(s: number, corner: number, off: number) {
  const arc = Math.max(0.001, corner + off);
  const len = (arc * Math.PI) / 2;
  if (s <= 0) return { x: -corner + s, y: -off };
  if (s >= len) return { x: off, y: corner + (s - len) };
  const th = Math.PI / 2 - s / arc;
  return { x: -corner + arc * Math.cos(th), y: corner - arc * Math.sin(th) };
}

/* ── dónde se esconden, y tiene que estar DENTRO seguro ──── */
const hideAt = (corner: number) => (corner >= R + 2 ? corner * Math.SQRT2 : Math.max(R * Math.SQRT2 + 2, corner * Math.SQRT2 + corner + 2));

/* el aire entre la tarjeta y el abanico: la ventana útil es 20..40 */
const gapPx = (reach: number) => 6 + (clamp(reach, 20, 40) / 100) * 24;

/* el espacio que el bloque reserva arriba y abajo para el abanico */
const AIR = Math.ceil(gapPx(100) + DOT);

/* el compás entre un botón y el siguiente, en lo alto del rango */
const BEAT = 90;

export interface NodeAction {
  id: string;
  label: string;
  Icon: LucideIcon;
  onSelect: () => void;
}

export function ActionNode({
  title,
  description,
  Mark,
  accent = 'var(--color-primary)',
  footer,
  actions,
  onOpen,
  openLabel,
  reach = 25,
  bounce = 20,
  stagger = 55,
  corner = 20,
}: {
  title: string;
  description?: string;
  Mark: LucideIcon;
  accent?: string;
  footer?: ReactNode;
  /** De 2 a 4 acciones. Nada destructivo: aparecen bajo el cursor. */
  actions: NodeAction[];
  /** Acción principal al pulsar la tarjeta. */
  onOpen?: () => void;
  openLabel?: string;
  reach?: number;
  bounce?: number;
  stagger?: number;
  corner?: number;
}) {
  const shown = actions.slice(0, 4);
  const n = clamp(shown.length, 1, 4);
  const [still] = useState(prefersReducedMotion);

  const [on, setOn] = useState(false);
  const [lit, setLit] = useState([false, false, false, false]);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    const gap = still ? 0 : (clamp(stagger, 0, 100) / 100) * BEAT;
    for (let i = 0; i < 4; i += 1) {
      /* abrir va del primero al último; cerrar, del último al primero */
      const place = on ? i : n - 1 - i;
      const at = gap * place;
      const set = () =>
        setLit((prev) => {
          if (prev[i] === on) return prev;
          const next = [...prev];
          next[i] = on;
          return next;
        });
      if (at <= 0) set();
      else timers.current.push(window.setTimeout(set, at));
    }
    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, [on, n, stagger, still]);

  const p0 = useSpring(lit[0] ? 100 : 0, bounce, still);
  const p1 = useSpring(lit[1] ? 100 : 0, bounce, still);
  const p2 = useSpring(lit[2] ? 100 : 0, bounce, still);
  const p3 = useSpring(lit[3] ? 100 : 0, bounce, still);
  const at = [p0, p1, p2, p3];

  const c = clamp(corner, 0, 32);
  const off = gapPx(reach) + R;
  const mid = ((c + off) * Math.PI) / 4;
  const spots = Array.from({ length: n }, (_, i) => ride(mid + (i - (n - 1) / 2) * SPACING, c, off));

  const deep = hideAt(c) / Math.SQRT2;
  const hid = { x: -deep, y: deep };

  /* ── el aire entre la tarjeta y el abanico es un HUECO ─────
     Sin una zona de contacto, al ir del borde hacia un botón el
     puntero sale del bloque y el abanico se cierra bajo él. */
  const BLEED = 6;
  const box = spots.reduce(
    (b, s) => ({
      l: Math.min(b.l, s.x - R - BLEED),
      r: Math.max(b.r, s.x + R + BLEED),
      t: Math.min(b.t, s.y - R - BLEED),
      d: Math.max(b.d, s.y + R + BLEED),
    }),
    { l: 0, r: 0, t: 0, d: 0 },
  );
  const pw = box.r - box.l;
  const ph = box.d - box.t;
  const px = -box.l;
  const py = -box.t;
  const bx = Math.max(0, px - c);
  const by = Math.min(ph, py + c);

  return (
    <div
      className="nod"
      style={
        {
          '--nod-r': `${c}px`,
          '--nod-mark-r': `${Math.min(15, c * 0.47).toFixed(2)}px`,
          '--nod-accent': accent,
          paddingBlock: AIR,
        } as CSSProperties
      }
      onPointerEnter={() => setOn(true)}
      onPointerOut={(e) => {
        const to = e.relatedTarget as Node | null;
        if (!to || !e.currentTarget.contains(to)) setOn(false);
      }}
      onPointerCancel={() => setOn(false)}
      onFocus={() => setOn(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOn(false);
      }}
    >
      <div className="nod-card" data-on={on || undefined}>
        <div className="nod-top">
          <span className="nod-mark" aria-hidden="true">
            <Mark size={18} strokeWidth={2} />
          </span>
          <h3 className="nod-name">
            {onOpen ? (
              <button type="button" className="nod-open" onClick={onOpen} aria-label={openLabel}>
                {title}
              </button>
            ) : (
              title
            )}
          </h3>
        </div>
        {description && <p className="nod-say">{description}</p>}
        {footer && <div className="nod-foot">{footer}</div>}
      </div>

      <div className="nod-fan" style={{ top: AIR, right: 0 }}>
        <i
          className="nod-reach"
          aria-hidden="true"
          data-on={on || undefined}
          style={{
            left: box.l,
            top: box.t,
            width: pw,
            height: ph,
            clipPath: `polygon(0 0, ${pw}px 0, ${pw}px ${ph}px, ${bx}px ${ph}px, ${bx}px ${by}px, 0 ${by}px)`,
          }}
        />
        {shown.map((a, i) => {
          const u = clamp(at[i] / 100, 0, 1.4);
          const spot = spots[i];
          const put = (from: number, to: number) => from + (to - from) * u;
          return (
            <button
              key={a.id}
              className="nod-act"
              type="button"
              aria-label={a.label}
              title={a.label}
              tabIndex={on ? 0 : -1}
              onClick={a.onSelect}
              style={
                {
                  width: DOT,
                  height: DOT,
                  marginTop: -R,
                  marginLeft: -R,
                  translate: `${put(hid.x, spot.x)}px ${put(hid.y, spot.y)}px`,
                  '--pop': 0.82 + 0.18 * Math.min(u, 1),
                } as CSSProperties
              }
            >
              <a.Icon size={16} strokeWidth={2} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
