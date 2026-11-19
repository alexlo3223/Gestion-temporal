import { FolderOpen, ListTodo, Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import { HOME_WIDGETS } from '../../constants';
import { addWidget, widgetId } from '../../store/layout';
import { compareByPriority, openTasks } from '../../store/selectors';
import type { AppState, HomeWidget, HomeWidgetType } from '../../types';
import { ColorDot } from './primitives';
import { BLOCK_MIME } from './WidgetGrid';

const FIXED = (Object.keys(HOME_WIDGETS) as HomeWidgetType[]).filter((t) => !HOME_WIDGETS[t].ref);

/** Herramienta de edición: bloques que se arrastran (o se pulsan) hasta la cuadrícula. Los de proyecto y tarea llevan su referencia. */
export function BlockPalette({ layout, state, onChange }: { layout: HomeWidget[]; state: AppState; onChange: (layout: HomeWidget[]) => void }) {
  const placed = new Set(layout.map((w) => w.id));
  const hiddenFixed = FIXED.filter((t) => !placed.has(t));
  const projects = state.projects.filter((p) => !placed.has(widgetId('project', p.id)));
  const tasks = openTasks(state)
    .sort(compareByPriority)
    .filter((t) => !placed.has(widgetId('task', t.id)));

  const chip = (type: HomeWidgetType, label: string, ref?: string, leading?: ReactNode) => (
    <button
      key={widgetId(type, ref)}
      type="button"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData(BLOCK_MIME, JSON.stringify({ type, ref }));
        e.dataTransfer.setData('text/plain', label);
      }}
      onClick={() => onChange(addWidget(layout, type, ref))}
      className="inline-flex max-w-full cursor-grab items-center gap-1.5 rounded-lg bg-surface-container px-space-sm py-1.5 text-label-sm hover:bg-surface-container-high active:cursor-grabbing"
      title={`Arrastra a la cuadrícula o pulsa para añadir «${label}»`}
    >
      {leading ?? <Plus size={14} className="shrink-0 text-primary" aria-hidden="true" />}
      <span className="truncate">{label}</span>
    </button>
  );
  const group = (title: string, Icon: typeof FolderOpen, items: ReactNode[], empty: string) => (
    <div className="flex min-w-0 flex-col gap-space-xs">
      <h3 className="caps flex items-center gap-1.5">
        <Icon size={14} aria-hidden="true" />
        {title}
      </h3>
      <div className="flex max-h-28 flex-wrap gap-1.5 scroll-contain overflow-y-auto">{items.length ? items : <span className="text-label-sm text-outline">{empty}</span>}</div>
    </div>
  );

  return (
    <section className="card flex flex-col gap-space-md" aria-label="Añadir bloques">
      <p className="text-body-sm text-on-surface-variant">Coge un bloque y suéltalo en la cuadrícula (o púlsalo para añadirlo al final). Los de proyecto y tarea muestran esa carpeta o tarea concreta.</p>
      <div className="grid gap-space-md md:grid-cols-3">
        {group('Bloques', Plus, hiddenFixed.map((t) => chip(t, HOME_WIDGETS[t].label)), 'Están todos en pantalla')}
        {group('Proyectos', FolderOpen, projects.map((p) => chip('project', p.name, p.id, <ColorDot color={p.color} size={8} />)), 'Todos añadidos')}
        {group('Tareas pendientes', ListTodo, tasks.map((t) => chip('task', t.title, t.id)), 'Sin tareas pendientes')}
      </div>
    </section>
  );
}
