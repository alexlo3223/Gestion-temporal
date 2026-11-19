// Distribución de Inicio: lista ordenada de bloques con tamaño en celdas (1 a 3 × 1 a 3) que se colocan sin huecos.
import { HOME_WIDGETS, MAX_WIDGETS, WIDGET_SIZE } from '../constants';
import type { HomeWidget, HomeWidgetType } from '../types';

const TYPES = Object.keys(HOME_WIDGETS) as HomeWidgetType[];
const FIXED = TYPES.filter((t) => !HOME_WIDGETS[t].ref);

const clampSize = (v: unknown, fallback: number) => (Number.isInteger(v) ? Math.min(WIDGET_SIZE.max, Math.max(WIDGET_SIZE.min, v as number)) : fallback);

export const widgetId = (type: HomeWidgetType, ref?: string) => (ref ? `${type}:${ref}` : type);

/** Un bloque nuevo, con el tamaño de serie de su tipo. */
const make = (type: HomeWidgetType, ref?: string): HomeWidget => {
  const { w, h } = HOME_WIDGETS[type];
  return ref ? { id: widgetId(type, ref), type, ref, w, h } : { id: widgetId(type, ref), type, w, h };
};

/** Serie: los bloques fijos y, uno por cada carpeta, su panel individual. */
export const defaultHomeLayout = (projectIds: string[] = []): HomeWidget[] => [...FIXED.map((t) => make(t)), ...projectIds.map((id) => make('project', id))];

/**
 * Distribución guardada saneada: tipos conocidos sin repetir, referencias con id y tamaños dentro de 1 a 3. Acepta el formato
 * antiguo (`id` = tipo, con fila y columna) y el bloque «Proyectos» de versiones anteriores, que se sustituye por un panel por
 * carpeta en su mismo sitio. Sin nada guardado, la de serie.
 */
export function resolveHomeLayout(saved: readonly unknown[] | undefined, projectIds: string[] = []): HomeWidget[] {
  if (!Array.isArray(saved)) return defaultHomeLayout(projectIds);
  const pos = (v: unknown, key: 'row' | 'col') => {
    const n = (v as Record<string, unknown> | null)?.[key];
    return typeof n === 'number' ? n : 0;
  };
  const items = [...saved].sort((a, b) => pos(a, 'row') - pos(b, 'row') || pos(a, 'col') - pos(b, 'col')); // sort estable: sin posición, se queda el orden
  const out: HomeWidget[] = [];
  const push = (widget: HomeWidget) => {
    if (out.some((o) => o.id === widget.id) || out.length >= MAX_WIDGETS) return;
    out.push(widget);
  };
  for (const raw of items as Record<string, unknown>[]) {
    const type = (typeof raw?.type === 'string' ? raw.type : raw?.id) as string; // viene de almacenamiento: se comprueba aquí
    if (type === 'projects') {
      // bloque antiguo «Proyectos en ejecución»: cada carpeta pasa a tener su panel en este mismo sitio
      projectIds.forEach((id) => push(make('project', id)));
      continue;
    }
    if (typeof type !== 'string' || !Object.hasOwn(HOME_WIDGETS, type)) continue;
    const kind = type as HomeWidgetType;
    const ref = typeof raw.ref === 'string' && raw.ref ? raw.ref : undefined;
    if (!!HOME_WIDGETS[kind].ref !== !!ref) continue; // un bloque de referencia sin ref, o uno fijo con ella, no tiene sentido
    const { w, h } = HOME_WIDGETS[kind];
    push({ ...make(kind, ref), w: clampSize(raw.w, w), h: clampSize(raw.h, h) });
  }
  return out;
}

/** Mueve un bloque a la posición `to` (índice en la lista resultante); los demás se corren. */
export function moveWidget(layout: HomeWidget[], id: string, to: number): HomeWidget[] {
  const from = layout.findIndex((w) => w.id === id);
  if (from < 0) return layout;
  const next = [...layout];
  const [w] = next.splice(from, 1);
  next.splice(Math.min(next.length, Math.max(0, to)), 0, w);
  return next;
}

/** Cambia el tamaño de un bloque en celdas (cada medida entre 1 y 3). */
export function resizeWidget(layout: HomeWidget[], id: string, size: { w?: number; h?: number }): HomeWidget[] {
  return layout.map((w) => (w.id === id ? { ...w, w: clampSize(size.w ?? w.w, 1), h: clampSize(size.h ?? w.h, 1) } : w));
}

/** Añade un bloque al final; si ya está, no hace nada. */
export function addWidget(layout: HomeWidget[], type: HomeWidgetType, ref?: string): HomeWidget[] {
  const id = widgetId(type, ref);
  if (layout.some((w) => w.id === id) || layout.length >= MAX_WIDGETS) return layout;
  return [...layout, make(type, ref)];
}

export const removeWidget = (layout: HomeWidget[], id: string) => layout.filter((w) => w.id !== id);

/** Tamaño de un bloque, con el de serie si no lo tiene. */
export const sizeOf = (w: HomeWidget) => ({ w: clampSize(w.w, HOME_WIDGETS[w.type].w), h: clampSize(w.h, HOME_WIDGETS[w.type].h) });
