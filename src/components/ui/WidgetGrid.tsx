import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, GripVertical, Minus, Plus } from 'lucide-react';
import { type CSSProperties, type ReactNode, useState } from 'react';
import { GRID_COLS, HOME_WIDGETS, MAX_ROWS, MIN_SPAN } from '../../constants';
import { placeWidget } from '../../store/layout';
import type { HomeWidget, HomeWidgetId } from '../../types';

interface Drag {
  id: HomeWidgetId;
  /** columna del bloque por la que se agarró, para que caiga donde se ve y no desde su borde izquierdo */
  grab: number;
}

/**
 * Cuadrícula libre de 12 columnas: cada bloque guarda su columna y fila, y los huecos se respetan.
 * En edición se ven las celdas; un bloque se arrastra a cualquier celda (los que pise bajan) y
 * también se mueve y redimensiona con botones, para teclado.
 */
export function WidgetGrid({ layout, editing, render, onChange }: { layout: HomeWidget[]; editing: boolean; render: (id: HomeWidgetId) => ReactNode; onChange: (layout: HomeWidget[]) => void }) {
  const [drag, setDrag] = useState<Drag | null>(null);
  const [hover, setHover] = useState<{ col: number; row: number } | null>(null);

  const rowsOf = (id: HomeWidgetId) => (HOME_WIDGETS[id].tall ? 2 : 1);
  const lastRow = Math.max(1, ...layout.map((w) => w.row + rowsOf(w.id) - 1));
  const rows = Math.min(MAX_ROWS, lastRow + (editing ? 2 : 0)); // en edición, filas libres debajo para soltar

  const dragged = drag && layout.find((w) => w.id === drag.id);
  const target = dragged && hover ? { col: Math.min(GRID_COLS - dragged.span + 1, Math.max(1, hover.col - drag.grab)), row: hover.row } : null;
  const inTarget = (c: number, r: number) => !!(target && dragged && c >= target.col && c < target.col + dragged.span && r >= target.row && r < target.row + rowsOf(dragged.id));

  const end = () => {
    setDrag(null);
    setHover(null);
  };
  const btn = 'grid size-7 shrink-0 place-items-center rounded-md text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface disabled:opacity-30';

  return (
    <div className="grid grid-cols-1 items-start gap-space-md sm:grid-cols-12 sm:auto-rows-[minmax(5rem,auto)]">
      {editing &&
        Array.from({ length: rows * GRID_COLS }, (_, i) => {
          const col = (i % GRID_COLS) + 1;
          const row = Math.floor(i / GRID_COLS) + 1;
          return (
            <div
              key={i}
              aria-hidden="true"
              className={`hidden self-stretch rounded-lg border border-dashed sm:block ${inTarget(col, row) ? 'border-primary bg-primary/15' : 'border-outline-variant/60 bg-primary/[0.03]'}`}
              style={{ gridColumn: col, gridRow: row }}
              onDragOver={(e) => {
                if (!drag) return;
                e.preventDefault();
                if (hover?.col !== col || hover?.row !== row) setHover({ col, row });
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (drag && target) onChange(placeWidget(layout, drag.id, target));
                end();
              }}
            />
          );
        })}
      {layout.map((w) => {
        const meta = HOME_WIDGETS[w.id];
        const move = (patch: Partial<HomeWidget>) => onChange(placeWidget(layout, w.id, patch));
        return (
          <div
            key={w.id}
            className={`relative z-10 sm:[grid-column:var(--c)] sm:[grid-row:var(--r)] ${editing ? 'rounded-xl outline-2 outline-offset-4 outline-dashed outline-outline-variant' : ''} ${drag ? 'pointer-events-none' : ''} ${drag?.id === w.id ? 'opacity-40' : ''}`}
            style={{ '--c': `${w.col} / span ${w.span}`, '--r': `${w.row} / span ${rowsOf(w.id)}` } as CSSProperties}
            draggable={editing}
            onDragStart={(e) => {
              const box = e.currentTarget.getBoundingClientRect();
              const grab = Math.min(w.span - 1, Math.max(0, Math.floor(((e.clientX - box.left) / box.width) * w.span)));
              e.dataTransfer.effectAllowed = 'move';
              e.dataTransfer.setData('text/plain', w.id); // Firefox no arrastra sin datos
              // después del dragstart: si los bloques dejan de recibir el puntero antes, el navegador cancela el arrastre
              setTimeout(() => setDrag({ id: w.id, grab }));
            }}
            onDragEnd={end}
          >
            {editing && (
              <div className="mb-1 flex cursor-grab items-center gap-0.5 rounded-lg bg-surface-container-high px-1.5 py-1 active:cursor-grabbing">
                <GripVertical size={15} className="shrink-0 text-outline" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-label-sm font-medium" title={meta.label}>
                  {meta.label}
                </span>
                <button type="button" className={btn} onClick={() => move({ col: w.col - 1 })} disabled={w.col === 1} aria-label={`Mover ${meta.label} a la izquierda`} title="Izquierda">
                  <ChevronLeft size={15} />
                </button>
                <button type="button" className={btn} onClick={() => move({ col: w.col + 1 })} disabled={w.col + w.span > GRID_COLS} aria-label={`Mover ${meta.label} a la derecha`} title="Derecha">
                  <ChevronRight size={15} />
                </button>
                <button type="button" className={btn} onClick={() => move({ row: w.row - 1 })} disabled={w.row === 1} aria-label={`Subir ${meta.label}`} title="Arriba">
                  <ChevronUp size={15} />
                </button>
                <button type="button" className={btn} onClick={() => move({ row: w.row + 1 })} disabled={w.row === MAX_ROWS} aria-label={`Bajar ${meta.label}`} title="Abajo">
                  <ChevronDown size={15} />
                </button>
                <button type="button" className={btn} onClick={() => move({ span: w.span - 1 })} disabled={w.span === MIN_SPAN} aria-label={`Estrechar ${meta.label} (${w.span} de 12 columnas)`} title={`Más estrecho (${w.span}/12)`}>
                  <Minus size={15} />
                </button>
                <button type="button" className={btn} onClick={() => move({ span: w.span + 1, col: Math.min(w.col, GRID_COLS - w.span) })} disabled={w.span === GRID_COLS} aria-label={`Ensanchar ${meta.label} (${w.span} de 12 columnas)`} title={`Más ancho (${w.span}/12)`}>
                  <Plus size={15} />
                </button>
              </div>
            )}
            {/* en edición el contenido no recibe clics: así arrastrar no abre nada por error */}
            <div className={editing ? 'pointer-events-none select-none' : ''}>{render(w.id)}</div>
          </div>
        );
      })}
    </div>
  );
}
