import { closestCenter, DndContext, DragOverlay, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragOverEvent, type DragStartEvent } from '@dnd-kit/core';
import { arrayMove, rectSortingStrategy, SortableContext, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronLeft, ChevronRight, GripVertical, Maximize2, Minimize2, Plus, X } from 'lucide-react';
import { type CSSProperties, type DragEvent, type ReactNode, useRef, useState } from 'react';
import { HOME_COLUMNS, HOME_GAP, HOME_WIDGETS, WIDGET_SIZE } from '../../constants';
import { useElementWidth } from '../../hooks/useElementWidth';
import { addWidget, moveWidget, removeWidget, resizeWidget, sizeOf, widgetId } from '../../store/layout';
import type { HomeWidget, HomeWidgetType } from '../../types';

/** Tipo de dato con el que la paleta de bloques arrastra un bloque nuevo. */
export const BLOCK_MIME = 'application/x-home-block';

const btn = 'grid size-7 shrink-0 place-items-center rounded-md text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface disabled:opacity-30';

/**
 * Cuadrícula de celdas cuadradas. Cada bloque ocupa de 1 a 3 columnas y de 1 a 3 filas, y se colocan en orden sin huecos.
 * En edición se arrastra un bloque y los demás se reordenan mientras se mueve, igual que el tablero de tareas: el bloque
 * completo va con el cursor y el nuevo orden se guarda al soltar. Los bloques de la paleta se sueltan en cualquier posición.
 */
export function WidgetGrid({
  layout,
  editing,
  title,
  render,
  onChange,
}: {
  layout: HomeWidget[];
  editing: boolean;
  title: (w: HomeWidget) => string;
  render: (w: HomeWidget) => ReactNode;
  onChange: (layout: HomeWidget[]) => void;
}) {
  const grid = useRef<HTMLDivElement | null>(null);
  const width = useElementWidth(grid, 960);
  const cols = HOME_COLUMNS(width);
  const cell = Math.floor((width - HOME_GAP * (cols - 1)) / cols); // celda cuadrada: el ancho de una columna

  // durante el arrastre se muestra el orden de `preview`; al soltar se guarda en la app
  const [activeId, setActiveId] = useState<string | null>(null);
  const [preview, setPreview] = useState<HomeWidget[] | null>(null);
  const [paletteOver, setPaletteOver] = useState<number | null>(null); // posición donde caerá un bloque de la paleta
  const shown = preview ?? layout;
  const activeWidget = activeId ? shown.find((w) => w.id === activeId) : undefined;

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const onDragStart = (e: DragStartEvent) => {
    setActiveId(String(e.active.id));
    setPreview(layout);
  };
  const onDragOver = (e: DragOverEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setPreview((prev) => {
      const current = prev ?? layout;
      const from = current.findIndex((w) => w.id === active.id);
      const to = current.findIndex((w) => w.id === over.id);
      return from < 0 || to < 0 || from === to ? prev : arrayMove(current, from, to);
    });
  };
  const finish = () => {
    setActiveId(null);
    setPreview(null);
  };
  const onDragEnd = () => {
    if (preview && preview.some((w, i) => w.id !== layout[i]?.id)) onChange(preview);
    finish();
  };

  /** Bloque de la paleta soltado en `index` (nativo: la paleta no usa dnd-kit). */
  const dropPalette = (e: DragEvent, index: number) => {
    const raw = e.dataTransfer.getData(BLOCK_MIME);
    if (!raw) return;
    e.preventDefault();
    e.stopPropagation();
    setPaletteOver(null);
    try {
      const { type, ref } = JSON.parse(raw) as { type: HomeWidgetType; ref?: string };
      if (Object.hasOwn(HOME_WIDGETS, type)) onChange(moveWidget(addWidget(layout, type, ref), widgetId(type, ref), index));
    } catch {
      /* dato ajeno: se ignora */
    }
  };
  const paletteHover = (e: DragEvent, index: number) => {
    if (!editing || !e.dataTransfer.types.includes(BLOCK_MIME)) return;
    e.preventDefault();
    e.stopPropagation();
    if (paletteOver !== index) setPaletteOver(index);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd} onDragCancel={finish}>
      <SortableContext items={shown.map((w) => w.id)} strategy={rectSortingStrategy}>
        <div
          ref={grid}
          className="grid items-stretch"
          style={{ gap: HOME_GAP, gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gridAutoRows: `${Math.max(cell, 1)}px`, gridAutoFlow: 'row dense' }}
          onDragOver={(e) => paletteHover(e, shown.length)}
          onDrop={(e) => dropPalette(e, shown.length)}
        >
          {shown.map((w, i) => (
            <Tile
              key={w.id}
              w={w}
              index={i}
              cols={cols}
              editing={editing}
              label={title(w)}
              dragging={activeId === w.id}
              paletteOver={paletteOver === i}
              onPaletteDragOver={(e) => paletteHover(e, i)}
              onPaletteDrop={(e) => dropPalette(e, i)}
              layout={layout}
              onChange={onChange}
              render={render}
            />
          ))}
          {editing && (
            <div
              style={{ gridColumn: 'span 1' }}
              className={`grid min-h-0 place-items-center rounded-xl border-2 border-dashed p-space-sm text-center text-outline ${paletteOver === shown.length ? 'border-primary bg-primary/10 text-primary' : 'border-outline-variant/60'}`}
              onDragOver={(e) => paletteHover(e, shown.length)}
              onDrop={(e) => dropPalette(e, shown.length)}
            >
              <span className="flex items-center gap-1 text-label-sm">
                <Plus size={16} aria-hidden="true" />
                Suelta aquí para poner al final
              </span>
            </div>
          )}
        </div>
      </SortableContext>
      <DragOverlay>
        {activeWidget ? (
          <div className="h-full w-full rounded-xl shadow-overlay ring-2 ring-primary/60">
            <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl pointer-events-none select-none">{render(activeWidget)}</div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

/** Una celda de la cuadrícula: ordenable con dnd-kit en edición, con su barra de controles. */
function Tile({
  w,
  index,
  cols,
  editing,
  label,
  dragging,
  paletteOver,
  onPaletteDragOver,
  onPaletteDrop,
  layout,
  onChange,
  render,
}: {
  w: HomeWidget;
  index: number;
  cols: number;
  editing: boolean;
  label: string;
  dragging: boolean;
  paletteOver: boolean;
  onPaletteDragOver: (e: DragEvent) => void;
  onPaletteDrop: (e: DragEvent) => void;
  layout: HomeWidget[];
  onChange: (layout: HomeWidget[]) => void;
  render: (w: HomeWidget) => ReactNode;
}) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({ id: w.id, disabled: !editing });
  const { w: cw, h: ch } = sizeOf(w);
  const canGrow = (dim: 'w' | 'h') => (dim === 'w' ? cw < Math.min(WIDGET_SIZE.max, cols) : ch < WIDGET_SIZE.max);
  const canShrink = (dim: 'w' | 'h') => (dim === 'w' ? cw > WIDGET_SIZE.min : ch > WIDGET_SIZE.min);
  const style: CSSProperties = {
    gridColumn: `span ${Math.min(cw, cols)}`,
    gridRow: `span ${ch}`,
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(editing ? attributes : {})}
      {...(editing ? listeners : {})}
      onDragOver={onPaletteDragOver}
      onDrop={onPaletteDrop}
      className={`relative flex min-h-0 min-w-0 flex-col rounded-xl ${editing ? `cursor-grab touch-none outline-2 outline-offset-4 outline-dashed ${paletteOver ? 'outline-primary' : 'outline-outline-variant'} active:cursor-grabbing` : ''} ${isDragging || dragging ? 'opacity-40' : ''}`}
    >
      {editing && (
        <div className="mb-1 flex shrink-0 flex-wrap items-center gap-0.5 rounded-lg bg-surface-container-high px-1.5 py-1">
          <GripVertical size={15} className="shrink-0 text-outline" aria-hidden="true" />
          <span className="w-full min-w-0 truncate text-label-sm font-medium" title={label}>
            {label}
          </span>
          <button type="button" className={btn} onClick={() => onChange(moveWidget(layout, w.id, index - 1))} disabled={index === 0} aria-label={`Mover ${label} antes`} title="Antes">
            <ChevronLeft size={15} />
          </button>
          <button type="button" className={btn} onClick={() => onChange(moveWidget(layout, w.id, index + 1))} disabled={index === layout.length - 1} aria-label={`Mover ${label} después`} title="Después">
            <ChevronRight size={15} />
          </button>
          <button type="button" className={btn} onClick={() => onChange(resizeWidget(layout, w.id, { w: cw - 1 }))} disabled={!canShrink('w')} aria-label={`Estrechar ${label} (${cw} de ${cols} columnas)`} title={`Estrechar (${cw} columnas)`}>
            <Minimize2 size={15} className="rotate-90" />
          </button>
          <button type="button" className={btn} onClick={() => onChange(resizeWidget(layout, w.id, { w: cw + 1 }))} disabled={!canGrow('w')} aria-label={`Ensanchar ${label} (${cw} de ${cols} columnas)`} title={`Ensanchar (${cw} columnas)`}>
            <Maximize2 size={15} className="rotate-90" />
          </button>
          <button type="button" className={btn} onClick={() => onChange(resizeWidget(layout, w.id, { h: ch - 1 }))} disabled={!canShrink('h')} aria-label={`Reducir la altura de ${label} (${ch} de 3)`} title={`Menos alto (${ch} filas)`}>
            <Minimize2 size={15} />
          </button>
          <button type="button" className={btn} onClick={() => onChange(resizeWidget(layout, w.id, { h: ch + 1 }))} disabled={!canGrow('h')} aria-label={`Aumentar la altura de ${label} (${ch} de 3)`} title={`Más alto (${ch} filas)`}>
            <Maximize2 size={15} />
          </button>
          <button type="button" className={btn} onClick={() => onChange(removeWidget(layout, w.id))} aria-label={`Quitar ${label}`} title="Quitar">
            <X size={15} />
          </button>
        </div>
      )}
      {/* en edición el contenido no recibe clics: así arrastrar no abre nada por error. Los paneles de proyecto no tienen scroll. */}
      <div className={`flex min-h-0 flex-1 flex-col rounded-xl [&>*]:min-h-0 [&>*]:flex-1 ${w.type === 'project' ? 'overflow-hidden' : 'scroll-contain overflow-y-auto'} ${editing ? 'pointer-events-none select-none' : ''}`}>
        {render(w)}
      </div>
    </div>
  );
}
