// Distribución de Inicio: bloques con posición libre en una cuadrícula de 12 columnas.
// Se respetan los huecos (no se compacta hacia la izquierda ni hacia arriba); solo se evita que dos bloques se pisen.
import { GRID_COLS, HOME_WIDGETS, MAX_ROWS, MIN_SPAN } from '../constants';
import type { HomeWidget, HomeWidgetId } from '../types';

const clampInt = (v: unknown, lo: number, hi: number, fallback: number) => (Number.isInteger(v) ? Math.min(hi, Math.max(lo, v as number)) : fallback);
const rowsOf = (w: HomeWidget) => (HOME_WIDGETS[w.id].tall ? 2 : 1);

export const overlaps = (a: HomeWidget, b: HomeWidget) =>
  a.col < b.col + b.span && b.col < a.col + a.span && a.row < b.row + rowsOf(b) && b.row < a.row + rowsOf(a);

/** Coloca los bloques en orden de prioridad: `first` manda; los demás bajan fila a fila hasta no pisar a nadie. */
function settle(layout: HomeWidget[], first?: HomeWidgetId): HomeWidget[] {
  const queue = [...layout].sort((a, b) => Number(b.id === first) - Number(a.id === first) || a.row - b.row || a.col - b.col);
  const placed: HomeWidget[] = [];
  for (const w of queue) {
    const next = { ...w };
    while (placed.some((p) => overlaps(p, next))) next.row += 1;
    placed.push(next);
  }
  return placed.sort((a, b) => a.row - b.row || a.col - b.col); // también es el orden en móvil (una columna)
}

/** Distribución guardada saneada: ids conocidos sin repetir, medidas dentro de la cuadrícula y lo que falte en su sitio de serie. */
export function resolveHomeLayout(saved: readonly HomeWidget[] | undefined): HomeWidget[] {
  const out: HomeWidget[] = [];
  for (const w of Array.isArray(saved) ? saved : []) {
    const id = w?.id as HomeWidgetId; // viene de almacenamiento: se comprueba aquí
    if (typeof id !== 'string' || !Object.hasOwn(HOME_WIDGETS, id) || out.some((o) => o.id === id)) continue;
    const def = HOME_WIDGETS[id];
    const span = clampInt(w.span, MIN_SPAN, GRID_COLS, def.span);
    out.push({ id, span, col: clampInt(w.col, 1, GRID_COLS - span + 1, Math.min(def.col, GRID_COLS - span + 1)), row: clampInt(w.row, 1, MAX_ROWS, def.row) });
  }
  for (const id of Object.keys(HOME_WIDGETS) as HomeWidgetId[]) {
    if (!out.some((o) => o.id === id)) out.push({ id, span: HOME_WIDGETS[id].span, col: HOME_WIDGETS[id].col, row: HOME_WIDGETS[id].row });
  }
  return settle(out);
}

/** Mueve o redimensiona un bloque; si pisa a otros, esos bajan. */
export function placeWidget(layout: HomeWidget[], id: HomeWidgetId, patch: Partial<Pick<HomeWidget, 'col' | 'row' | 'span'>>): HomeWidget[] {
  const moved = layout.map((w) => {
    if (w.id !== id) return w;
    const span = clampInt(patch.span ?? w.span, MIN_SPAN, GRID_COLS, w.span);
    return { ...w, span, col: clampInt(patch.col ?? w.col, 1, GRID_COLS - span + 1, w.col), row: clampInt(patch.row ?? w.row, 1, MAX_ROWS, w.row) };
  });
  return settle(moved, id);
}
