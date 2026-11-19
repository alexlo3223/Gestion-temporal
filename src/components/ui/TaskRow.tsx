import { actions } from '../../actions';
import { formatDueLabel } from '../../lib/format';
import { projectOf } from '../../store/selectors';
import type { AppState, Task } from '../../types';
import { ColorDot } from './primitives';

/** Fila compacta con casilla (listas de Inicio y Calendario). */
export function TaskRow({ task, state, today }: { task: Task; state: AppState; today: string }) {
  const done = task.status === 'done';
  const urgent = !done && task.priority === 'urgente';
  const late = !done && task.due && task.due < today;
  const tagClass = urgent ? 'text-primary' : late ? 'text-error' : 'text-outline';
  return (
    <label className="group flex cursor-pointer items-center justify-between gap-2 rounded-lg px-space-sm py-1.5 hover:bg-surface-container">
      <span className="flex min-w-0 items-center gap-space-sm">
        <input
          type="checkbox"
          checked={done}
          onChange={() => actions.toggleTask(task.id)}
          className="size-4 shrink-0 cursor-pointer accent-primary"
        />
        <ColorDot color={projectOf(state, task.projectId).color} size={6} />
        <span className={`truncate text-body-md transition-colors ${done ? 'text-outline line-through' : 'group-hover:text-primary'}`}>{task.title}</span>
      </span>
      <span className={`shrink-0 font-mono text-label-caps uppercase ${tagClass}`}>{urgent ? 'Urgente' : formatDueLabel(task.due, today)}</span>
    </label>
  );
}
