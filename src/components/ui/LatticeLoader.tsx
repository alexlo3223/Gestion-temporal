import { type CSSProperties, useEffect, useLayoutEffect, useRef, useState } from 'react';
import './LatticeLoader.css';

type Status = 'working' | 'done' | 'error';
type Cells = (number | null)[];
interface CustomPattern {
  cells: Cells;
  loop?: number;
  scale?: number;
  lit?: number;
}
interface Resolved {
  cells: Cells;
  loop: number;
  scale: number;
  lit: number;
}

// Cada patrón da, por celda, el instante (en pasos) en que se enciende; null = hueco.
const PATTERNS: Record<string, Partial<Record<3 | 4, Resolved | Omit<Resolved, 'lit'>>>> = {
  arrow: { 3: { cells: [1, 2, 3, 0, 1, 2, 1, 2, 3], loop: 7.2, scale: 1 } },
  dots: { 3: { cells: [0, 1, 2, 0, 1, 2, 0, 1, 2], loop: 3, scale: 2.4 } },
  ripple: { 3: { cells: [2, 1, 2, 1, 0, 1, 2, 1, 2], loop: 4.8, scale: 1.5 } },
  spiral: { 3: { cells: [0, 1, 2, 7, 8, 3, 6, 5, 4], loop: 9, scale: 1.2, lit: 0.35 } },
  orbit: {
    3: { cells: [0, 1, 2, 7, null, 3, 6, 5, 4], loop: 8, scale: 1.2 },
    4: { cells: [0, 1, 2, 3, 11, null, null, 4, 10, null, null, 5, 9, 8, 7, 6], loop: 6, scale: 1.2, lit: 0.45 },
  },
  snake: {
    3: { cells: [0, 1, 2, 5, 4, 3, 6, 7, 8], loop: 9, scale: 1, lit: 0.35 },
    4: { cells: [0, 1, 2, 3, 7, 6, 5, 4, 8, 9, 10, 11, 15, 14, 13, 12], loop: 16, scale: 1, lit: 0.25 },
  },
  sweep: { 4: { cells: [0, 1, 2, 3, 1, 2, 3, 4, 2, 3, 4, 5, 3, 4, 5, 6], loop: 5, scale: 1, lit: 0.45 } },
  spin: { 4: { cells: [0, 0, 1, 1, 0, 0, 1, 1, 3, 3, 2, 2, 3, 3, 2, 2], loop: 4, scale: 1.6, lit: 0.35 } },
  rain: { 4: { cells: [0, 2, 1, 3, 1, 3, 2, 4, 2, 4, 3, 5, 3, 5, 4, 6], loop: 4, scale: 1.2, lit: 0.35 } },
  pulse: { 4: { cells: [2, 1, 1, 2, 1, 0, 0, 1, 1, 0, 0, 1, 2, 1, 1, 2], loop: 2.4, scale: 2.5, lit: 0.45 } },
};
const DEFAULT_PATTERN = { 3: 'orbit', 4: 'sweep' } as const;
const DEFAULT_LIT = 0.62;
// Celdas que dibujan la marca final: ✓ al terminar, ✕ si falla.
const MARKS = {
  3: { done: [2, 3, 5, 7], error: [0, 2, 4, 6, 8] },
  4: { done: [7, 8, 10, 13], error: [0, 3, 5, 6, 9, 10, 12, 15] },
};

export type LatticePatternName = keyof typeof PATTERNS;

function resolvePattern(pattern: LatticePatternName | CustomPattern, grid: 3 | 4): Resolved {
  if (typeof pattern === 'string') {
    const named = PATTERNS[pattern]?.[grid] ?? PATTERNS[DEFAULT_PATTERN[grid]][grid]!;
    return { lit: DEFAULT_LIT, ...named };
  }
  const cells = Array.from({ length: grid * grid }, (_, i) => pattern.cells[i] ?? null);
  const max = Math.max(0, ...cells.filter((v): v is number => v != null));
  return { cells, loop: pattern.loop ?? max + 4.2, scale: pattern.scale ?? 1, lit: pattern.lit ?? DEFAULT_LIT };
}

const fmt = (ds: number) => (ds < 600 ? `${(ds / 10).toFixed(1)}s` : `${Math.floor(ds / 600)}m ${((ds % 600) / 10).toFixed(1)}s`);
const spoken = (ds: number) => (ds < 600 ? `${(ds / 10).toFixed(1)} segundos` : `${Math.floor(ds / 600)} minutos ${((ds % 600) / 10).toFixed(1)} segundos`);

export interface LatticeLoaderProps {
  label?: string;
  doneLabel?: string;
  errorLabel?: string;
  status?: Status;
  pattern?: LatticePatternName | CustomPattern;
  grid?: 3 | 4;
  shape?: 'round' | 'square';
  color?: string;
  doneColor?: string;
  errorColor?: string;
  cellSize?: number;
  gap?: number;
  fontSize?: number;
  /** Milisegundos entre celdas consecutivas del patrón. */
  step?: number;
  idleOpacity?: number;
  glow?: boolean;
  glowColor?: string;
  showTimer?: boolean;
  /** Segundos transcurridos, si se controla desde fuera; sin él, el propio componente cuenta. */
  elapsed?: number;
  className?: string;
  style?: CSSProperties;
}

/** Indicador de carga en cuadrícula de celdas, con estados de trabajo, terminado y error. */
export default function LatticeLoader({
  label = 'Cargando',
  doneLabel = 'Hecho en',
  errorLabel = 'Falló tras',
  status = 'working',
  pattern = 'orbit',
  grid = 3,
  shape = 'round',
  color = 'currentColor',
  doneColor = '#22c55e',
  errorColor = '#ef4444',
  cellSize = 6,
  gap = 2,
  fontSize = 14,
  step = 90,
  idleOpacity = 0.15,
  glow = false,
  glowColor = '',
  showTimer = true,
  elapsed,
  className = '',
  style,
}: LatticeLoaderProps) {
  const n = grid === 4 ? 4 : 3;
  const pat = resolvePattern(pattern, n);
  const marks = MARKS[n];
  const d = step * pat.scale;
  const cycle = Math.round(pat.loop * d);

  const timerRef = useRef<HTMLSpanElement>(null);
  const dsRef = useRef(0);
  // la marca que se muestra al terminar es la del último estado final, no la del de trabajo
  const markRef = useRef<'done' | 'error'>('done');
  const mark = status === 'working' ? markRef.current : status;
  markRef.current = mark;
  const [announce, setAnnounce] = useState(`${label}, en curso`);

  const paint = (ds: number) => {
    dsRef.current = ds;
    if (timerRef.current) timerRef.current.textContent = fmt(ds);
  };

  useLayoutEffect(() => {
    if (elapsed != null) {
      paint(Math.round(elapsed * 10));
      return undefined;
    }
    if (status !== 'working') return undefined;
    const startedAt = performance.now();
    paint(0);
    const id = setInterval(() => paint(Math.floor((performance.now() - startedAt) / 100)), 100);
    return () => clearInterval(id);
  }, [status, elapsed]);

  useEffect(() => {
    if (status === 'working') setAnnounce(`${label}, en curso`);
    else setAnnounce(`${status === 'done' ? doneLabel : errorLabel}${showTimer ? ` ${spoken(dsRef.current)}` : ''}`);
    // solo reacciona al cambio de estado: las etiquetas y el tiempo se leen tal y como están en ese momento
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const vars = {
    '--ll-n': n,
    '--ll-cell': `${cellSize}px`,
    '--ll-gap': `${gap}px`,
    '--ll-font': `${fontSize}px`,
    '--ll-color': color,
    '--ll-mark': status === 'error' ? errorColor : doneColor,
    '--ll-idle': idleOpacity,
    '--ll-glow': glowColor || color,
    '--ll-mark-glow': glowColor || (status === 'error' ? errorColor : doneColor),
    '--ll-cycle': `${cycle}ms`,
    ...style,
  } as CSSProperties;

  return (
    <span role="status" className={`lattice-loader${className ? ` ${className}` : ''}`} data-status={status} data-shape={shape} data-glow={glow ? '' : undefined} style={vars}>
      <span className="lattice-loader__grid" aria-hidden="true">
        <span className="lattice-loader__layer lattice-loader__run">
          {pat.cells.map((unit, i) => (
            <span
              key={i}
              className="lattice-loader__cell"
              data-hole={unit == null ? '' : undefined}
              data-lit={pat.lit !== DEFAULT_LIT ? Math.round(pat.lit * 100) : undefined}
              style={unit == null ? undefined : { animationDelay: `${Math.round(unit * d)}ms` }}
            />
          ))}
        </span>
        <span className="lattice-loader__layer lattice-loader__mark">
          {pat.cells.map((_, i) => (
            <span key={i} className="lattice-loader__cell" data-on={marks[mark].includes(i) ? '' : undefined} />
          ))}
        </span>
      </span>
      <span className="lattice-loader__label" aria-hidden="true">
        <span className="lattice-loader__text" data-active={status === 'working' ? '' : undefined}>
          {label}
        </span>
        <span className="lattice-loader__text" data-active={status === 'done' ? '' : undefined}>
          {doneLabel}
        </span>
        <span className="lattice-loader__text" data-active={status === 'error' ? '' : undefined}>
          {errorLabel}
        </span>
      </span>
      {showTimer ? (
        <span ref={timerRef} className="lattice-loader__timer" aria-hidden="true">
          0.0s
        </span>
      ) : null}
      <span className="lattice-loader__sr">{announce}</span>
    </span>
  );
}
