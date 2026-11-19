import { type CSSProperties, type PointerEvent, useEffect, useMemo, useRef, useState } from 'react';
import { animate, motion, useMotionValue } from 'framer-motion';
import { useElementWidth } from '../../hooks/useElementWidth';
import './StackedBars.css';

/* ══ Stacked bars ═════════════════════════════════════════
   Una pila por día (o semana) con una franja por categoría, y bajo
   la línea base una barra pequeña con un segundo dato.

   ADAPTADO para la app: los datos llegan por props (antes eran
   aleatorios con semilla), las categorías traen su propio color, el
   ancho se mide del contenedor y los textos están en español.

   ── RUN ALONG IT ────────────────────────────────────────
   La columna bajo el puntero recibe un anillo alrededor de su pila,
   el resto da un paso atrás (su color se mezcla hacia el fondo, no
   se desvanece) y un único tooltip la acompaña en un muelle.

   ── DAY / WEEK ──────────────────────────────────────────
   Cambia el conjunto de datos; cada segmento llega a su nueva altura
   un instante después que su vecino de la izquierda. La misma
   transición hace crecer las barras la primera vez que se ve. */

const PAD = 16;
const CH = 104; // espacio sobre la línea base
const BH = 22; // espacio bajo ella para la segunda serie
const SEG_GAP = 2;
const LIFT = 2; // aire entre la línea base y las barras a cada lado
const TIP_W = 150;
const SPRING = { type: 'spring' as const, stiffness: 380, damping: 34 };
const MONO = ['#e5e2e1', '#a1a1aa', '#71717a', '#52525b'];

export type StackedMode = 'Day' | 'Week';
export interface StackedBar {
  label: string;
  short: string;
  values: number[];
  below: number;
}
export interface StackedCategory {
  label: string;
  color: string;
}

const sum = (a: number[]) => a.reduce((s, v) => s + v, 0);
const defaultFormat = (v: number) => Math.round(v).toLocaleString('es-ES');

export function StackedBars({
  title,
  unit,
  categories,
  series,
  belowLabel,
  format = defaultFormat,
  colour = 'Colour',
  bars = 20,
  gap = 6,
}: {
  title: string;
  unit?: string;
  categories: StackedCategory[];
  series: Record<StackedMode, StackedBar[]>;
  belowLabel: string;
  format?: (value: number) => string;
  colour?: 'Mono' | 'Colour';
  bars?: number;
  gap?: number;
}) {
  const root = useRef<HTMLDivElement | null>(null);
  const plot = useRef<HTMLDivElement | null>(null);
  const width = Math.max(260, useElementWidth(root, 300));
  const CW = width - PAD * 2;
  const [mode, setMode] = useState<StackedMode>('Day');
  const [at, setAt] = useState<number | null>(null);
  const [seen, setSeen] = useState(false);

  const all = series[mode];
  const n = Math.max(1, Math.min(Math.round(bars), all.length));
  const data = useMemo(() => all.slice(all.length - n), [all, n]);
  const colorOf = (k: number) => (colour === 'Colour' ? categories[k]?.color : MONO[k % MONO.length]);

  /* crecen una vez, la primera vez que la tarjeta está en pantalla */
  useEffect(() => {
    const el = root.current;
    if (!el || seen) return;
    if (typeof IntersectionObserver === 'undefined') {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [seen]);

  /* geometría: el hueco cede antes de que una barra baje de 3px */
  const g = n > 1 ? Math.max(1, Math.min(gap, (CW - 3 * n) / (n - 1))) : 0;
  const bw = (CW - g * (n - 1)) / n;
  const r = Math.min(2.5, bw / 2);
  const totals = data.map((b) => sum(b.values));
  const maxT = Math.max(1, ...totals);
  const maxE = Math.max(1, ...data.map((b) => b.below));
  const scale = (CH - LIFT - 2 - SEG_GAP * (categories.length - 1)) / maxT;
  const layout = data.map((b) => {
    let y = 0;
    const segs = b.values.map((v) => {
      /* un valor a cero no dibuja nada (antes forzaba 2px y parecía un dato) */
      const h = v > 0 ? Math.max(2, v * scale) : 0;
      const s = { bottom: y, h };
      if (h > 0) y += h + SEG_GAP;
      return s;
    });
    return { segs, top: Math.max(0, y - SEG_GAP), esc: b.below > 0 ? Math.max(3, (b.below / maxE) * (BH - LIFT - 2)) : 0 };
  });

  /* la cifra principal: cada carácter va con la generación en la clave,
     así un total nuevo son elementos nuevos que entran de izquierda a
     derecha. El primer pintado no lo anima; solo un cambio. */
  const total = sum(totals);
  const [gen, setGen] = useState(0);
  const last = useRef(total);
  useEffect(() => {
    if (last.current === total) return;
    last.current = total;
    setGen((x) => x + 1);
  }, [total]);

  /* anillo y tooltip: se colocan de golpe al aparecer y se deslizan después */
  const ringX = useMotionValue(0);
  const ringY = useMotionValue(0);
  const ringH = useMotionValue(0);
  const tipX = useMotionValue(0);
  const was = useRef<number | null>(null);
  useEffect(() => {
    if (at === null || at >= n) {
      was.current = null;
      return;
    }
    const L = layout[at];
    const left = at * (bw + g);
    const up = seen ? L.top : 0;
    const down = seen ? L.esc : 0;
    const y = CH - LIFT - up - 3;
    const h = up + LIFT + 1 + LIFT + down + 6;
    /* junto a la columna: a la derecha mientras quepa, si no a la izquierda */
    const right = left + bw + 8;
    const tx = right + TIP_W <= CW || left - 8 - TIP_W < 0 ? Math.min(CW - TIP_W, right) : left - 8 - TIP_W;
    const go = (mv: typeof ringX, v: number) => {
      if (was.current === null) mv.set(v);
      else animate(mv, v, SPRING);
    };
    go(ringX, left - 3);
    go(ringY, y);
    go(ringH, h);
    go(tipX, tx);
    was.current = at;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [at, n, bw, g, mode, seen]);

  const pick = (e: PointerEvent) => {
    const b = plot.current?.getBoundingClientRect();
    if (!b || b.width === 0) return;
    const i = Math.floor(((e.clientX - b.left) / b.width) * n);
    setAt(Math.max(0, Math.min(n - 1, i)));
  };

  const cur = at !== null && at < n ? data[at] : null;
  const top2 = cur
    ? cur.values
        .map((v, k) => ({ v, k }))
        .filter(({ v }) => v > 0)
        .sort((a, b) => b.v - a.v)
        .slice(0, 2)
    : [];

  return (
    <div
      ref={root}
      className="stb"
      data-scrub={cur ? '' : undefined}
      style={{ '--stb-r': `${r}px`, '--stb-rr': `${r + 3}px` } as CSSProperties}
    >
      <div className="stb-head">
        <div className="stb-titles">
          <h2 className="stb-title">{title}</h2>
          <p className="stb-sub">
            Últimos {n} {mode === 'Day' ? 'días' : 'semanas'}
          </p>
        </div>
        <div className="stb-seg-ctl" data-mode={mode} role="tablist" aria-label="Agrupar por">
          <span className="stb-thumb" aria-hidden />
          {(['Day', 'Week'] as StackedMode[]).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              data-on={mode === m || undefined}
              className="stb-tab"
              onClick={() => setMode(m)}
            >
              {m === 'Day' ? 'Días' : 'Semanas'}
            </button>
          ))}
        </div>
      </div>

      <div className="stb-figure">
        <span className="stb-num" aria-label={format(total)}>
          {format(total)
            .split('')
            .map((ch, i) => (
              <span key={`${gen}-${i}`} className="stb-digit" data-pop={gen > 0 || undefined} style={{ '--i': i } as CSSProperties} aria-hidden>
                {ch}
              </span>
            ))}
        </span>
        {unit && <span className="stb-unit">{unit}</span>}
      </div>

      <ul className="stb-legend" aria-label="Leyenda">
        {categories.map((c, k) => (
          <li key={c.label}>
            <i style={{ '--c': colorOf(k) } as CSSProperties} />
            {c.label}
          </li>
        ))}
        <li>
          <i data-esc="" />
          {belowLabel}
        </li>
      </ul>

      <div
        ref={plot}
        className="stb-plot"
        style={{ height: CH + 1 + BH, width: CW }}
        role="img"
        aria-label={`${title}: ${format(total)} en total`}
        onPointerDown={(e) => {
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {
            /* evento sintético */
          }
          pick(e);
        }}
        onPointerMove={pick}
        onPointerUp={(e) => {
          try {
            e.currentTarget.releasePointerCapture(e.pointerId);
          } catch {
            /* sin captura */
          }
          if (e.pointerType !== 'mouse') setAt(null);
        }}
        onPointerCancel={() => setAt(null)}
        onPointerLeave={() => setAt(null)}
      >
        <span className="stb-base" style={{ top: CH }} />
        {data.map((_, i) => (
          <div key={i} className="stb-col" data-on={at === i || undefined} style={{ left: i * (bw + g), width: bw, '--i': i } as CSSProperties}>
            {layout[i].segs.map((s, k) => (
              <span
                key={k}
                className="stb-bar"
                style={
                  {
                    '--c': colorOf(k),
                    bottom: BH + 1 + LIFT + (seen ? s.bottom : 0),
                    height: seen ? s.h : 0,
                  } as CSSProperties
                }
              />
            ))}
            <span className="stb-esc" style={{ top: CH + 1 + LIFT, height: seen ? layout[i].esc : 0 }} />
          </div>
        ))}

        <motion.span className="stb-ring" aria-hidden style={{ x: ringX, y: ringY, height: ringH, width: bw + 6 }} />

        <motion.div className="stb-tip" style={{ x: tipX, width: TIP_W }} aria-hidden>
          {cur && at !== null && (
            <>
              <div className="stb-tip-head">
                <span>{cur.label}</span>
                <b>{format(totals[at])}</b>
              </div>
              {top2.map(({ v, k }) => (
                <div className="stb-tip-row" key={categories[k].label}>
                  <i style={{ '--c': colorOf(k) } as CSSProperties} />
                  <span>{categories[k].label}</span>
                  <b>{format(v)}</b>
                </div>
              ))}
              <div className="stb-tip-row" data-esc="">
                <i />
                <span>{belowLabel}</span>
                <b>{cur.below}</b>
              </div>
            </>
          )}
        </motion.div>
      </div>

      <div className="stb-axis" style={{ width: CW }}>
        <span>{data[0]?.short}</span>
        <span>{data[n - 1]?.short}</span>
      </div>
    </div>
  );
}
