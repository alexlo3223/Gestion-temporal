import { CalendarDays, GripVertical, Pencil, Play, Timer } from 'lucide-react';
import { actions } from '../../actions';
import { TASK_STATUSES } from '../../constants';
import { formatDueLabel, formatDuration } from '../../lib/format';
import { projectOf } from '../../store/selectors';
import type { AppState, Task } from '../../types';
import { ColorDot, PriorityBadge } from './primitives';

const revealOnHover = 'lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100';

/** Tarjeta arrastrable del tablero de tareas. */
export function TaskCard({ task, state, today }: { task: Task; state: AppState; today: string }) {
  const project = projectOf(state, task.projectId);
  const done = task.status === 'done';
  const late = !done && task.due && task.due < today;
  const canStart = !done && state.timer.taskId !== task.id;
  const dueText = done ? `Hecha ${formatDueLabel(task.doneAt, today).toLowerCase()}` : formatDueLabel(task.due, today);
  const time = task.spentMin ? `${formatDuration(task.spentMin)} / ${formatDuration(task.estimateMin)}` : formatDuration(task.estimateMin);

  return (
    <article
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', task.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      className={`group flex cursor-grab flex-col gap-space-xs rounded-lg bg-surface-container p-space-md transition-colors hover:bg-surface-container-high active:cursor-grabbing ${done ? 'opacity-70' : ''}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1">
          {/* asa para mover con teclado: ← / → cambian de columna (el ratón sigue arrastrando la tarjeta) */}
          <button
            type="button"
            data-move={task.id}
            onKeyDown={(e) => {
              const step = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
              const next = TASK_STATUSES[TASK_STATUSES.indexOf(task.status) + step];
              if (!step || !next) return;
              e.preventDefault();
              actions.moveTask(task.id, next);
              /* la tarjeta se vuelve a montar en otra columna: el foco la sigue */
              requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(`[data-move="${task.id}"]`)?.focus());
            }}
            className="-ml-1 cursor-grab rounded p-0.5 text-outline hover:text-on-surface"
            aria-label={`Mover «${task.title}» de columna con las flechas izquierda y derecha`}
            title="Arrastra, o enfoca y usa ← →"
          >
            <GripVertical size={14} aria-hidden="true" />
          </button>
          <PriorityBadge priority={task.priority} />
        </span>
        <span className="flex items-center gap-1 font-mono text-label-sm text-outline">
          <Timer size={13} aria-hidden="true" />
          {time}
        </span>
      </div>
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={done}
          onChange={() => actions.toggleTask(task.id)}
          className="mt-1 size-4 shrink-0 cursor-pointer accent-primary"
          aria-label={`Completar «${task.title}»`}
        />
        <div className="min-w-0">
          <h3 className={`text-body-md font-medium transition-colors ${done ? 'text-outline line-through' : 'group-hover:text-primary'}`}>{task.title}</h3>
          {task.description && !done && <p className="mt-0.5 line-clamp-2 text-body-sm text-outline">{task.description}</p>}
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 pt-space-xs">
        <span className="flex min-w-0 items-center gap-1.5 text-label-sm text-on-surface-variant">
          <ColorDot color={project.color} />
          <span className="truncate">{project.name}</span>
        </span>
        <span className="flex shrink-0 items-center gap-0.5">
          <span className={`mr-1 flex items-center gap-0.5 text-label-caps ${late ? 'text-error' : 'text-outline'}`}>
            <CalendarDays size={12} aria-hidden="true" />
            {dueText}
          </span>
          {canStart && (
            <button
              type="button"
              onClick={() => actions.startTimer(task.id)}
              className={`icon-btn hover:text-primary ${revealOnHover}`}
              aria-label={`Iniciar sesión de foco: ${task.title}`}
              title="Iniciar sesión de foco"
            >
              <Play size={16} aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            onClick={() => actions.openDrawer({ type: 'task', taskId: task.id })}
            className={`icon-btn ${revealOnHover}`}
            aria-label={`Editar tarea: ${task.title}`}
            title="Editar tarea"
          >
            <Pencil size={15} aria-hidden="true" />
          </button>
        </span>
      </div>
    </article>
  );
}
