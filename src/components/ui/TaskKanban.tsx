import { Plus } from 'lucide-react';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { actions } from '../../actions';
import { TASK_STATUSES } from '../../constants';
import { useRubberBand } from '../../hooks/useRubberBand';
import type { AppState, Task, TaskStatus } from '../../types';
import { Kanban, KanbanBoard, KanbanColumn, KanbanColumnContent, KanbanItem, KanbanItemHandle, KanbanOverlay } from '@/components/reui/kanban';
import { TaskCard } from './TaskCard';

const COLUMNS: Record<TaskStatus, { title: string; dotClass: string }> = {
  todo: { title: 'Por hacer', dotClass: 'bg-outline' },
  doing: { title: 'En progreso (foco)', dotClass: 'bg-primary-container animate-pulse' },
  done: { title: 'Completadas', dotClass: 'bg-surface-tint' },
};

/** Las tareas agrupadas por columna (estado), en el orden en que llegan. */
const groupByStatus = (tasks: Task[]) => Object.fromEntries(TASK_STATUSES.map((status) => [status, tasks.filter((t) => t.status === status)])) as Record<TaskStatus, Task[]>;

/**
 * Tablero de tareas con el Kanban de ReUI, usado como en su ejemplo: el componente guarda una copia de las columnas que se
 * reordena mientras arrastras (la tarjeta se ve moverse entre columnas), y al soltar (`onValueCommit`) se aplica el cambio
 * de estado en la app con `actions.moveTask`. La copia se vuelve a alinear con la app cada vez que cambian las tareas.
 * El orden dentro de una columna lo da la lista de la app (prioridad y fecha), así que reordenar dentro de una columna no se guarda.
 */
export function TaskKanban({ state, tasks, today, headers = {} }: { state: AppState; tasks: Task[]; today: string; headers?: Partial<Record<TaskStatus, ReactNode>> }) {
  const fromApp = useMemo(() => groupByStatus(tasks), [tasks]);
  const [columns, setColumns] = useState(fromApp);
  useEffect(() => setColumns(fromApp), [fromApp]);

  /* en móvil las columnas son un carrusel que encaja de una en una (centrada, nunca cortada), con resistencia al llegar al final */
  const scroller = useRef<HTMLDivElement | null>(null);
  useRubberBand(scroller);

  const byId = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);

  return (
    <Kanban
      value={columns}
      onValueChange={setColumns}
      getItemValue={(task) => task.id}
      onValueCommit={(_value, meta) => {
        // solo cambia de estado si se soltó en otra columna; el orden dentro de una columna no se guarda
        if (meta.kind === 'item' && meta.overContainer !== meta.activeContainer && TASK_STATUSES.includes(meta.overContainer as TaskStatus)) {
          actions.moveTask(String(meta.event.active.id), meta.overContainer as TaskStatus);
        }
      }}
    >
      <div
        ref={scroller}
        className="-mx-space-md snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-px-space-md px-space-md pb-1 [scrollbar-width:none] md:mx-0 md:snap-none md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden"
      >
        <KanbanBoard className="flex w-max items-start gap-space-md md:grid md:w-auto md:grid-cols-3">
          {TASK_STATUSES.map((status) => {
            const { title, dotClass } = COLUMNS[status];
            const header = headers[status];
            return (
              <KanbanColumn
                key={status}
                value={status}
                className="flex min-h-56 w-[84vw] max-w-sm shrink-0 snap-center flex-col gap-space-sm rounded-xl bg-surface-container-low p-space-md md:w-auto md:max-w-none md:shrink md:snap-align-none"
                aria-label={title}
              >
                <div className="flex items-center justify-between pb-1">
                  <h2 className="flex items-center gap-space-xs text-headline-sm">
                    <span className={`size-2 rounded-full ${dotClass}`} aria-hidden="true" />
                    {title}
                    <span className="rounded bg-surface-container px-1.5 py-0.5 font-mono text-label-caps text-outline">{columns[status].length + (header ? 1 : 0)}</span>
                  </h2>
                  {status === 'todo' && (
                    <button type="button" onClick={() => actions.openDrawer({ type: 'task', defaults: { due: today } })} className="icon-btn" aria-label="Añadir tarea" title="Añadir tarea">
                      <Plus size={16} aria-hidden="true" />
                    </button>
                  )}
                </div>
                {header}
                <KanbanColumnContent value={status} className="flex min-h-16 flex-col gap-space-sm">
                  {columns[status].map((task) => (
                    <KanbanItem key={task.id} value={task.id}>
                      <KanbanItemHandle>
                        <TaskCard task={task} state={state} today={today} native={false} />
                      </KanbanItemHandle>
                    </KanbanItem>
                  ))}
                </KanbanColumnContent>
                <p className="rounded-lg bg-surface-container-lowest p-space-sm text-center text-label-sm text-outline" aria-hidden="true">
                  Arrastra aquí
                </p>
              </KanbanColumn>
            );
          })}
        </KanbanBoard>
      </div>
      <KanbanOverlay>
        {({ value }) => {
          const task = byId.get(String(value));
          return task ? <TaskCard task={task} state={state} today={today} native={false} /> : <div className="size-full rounded-md bg-muted" />;
        }}
      </KanbanOverlay>
    </Kanban>
  );
}
