import { CheckCheck, CirclePause, LoaderCircle, Pause, Play, Square } from 'lucide-react';
import { actions } from '../../actions';
import { useNow } from '../../hooks/useNow';
import { formatCountdown, formatDuration, percentOf } from '../../lib/format';
import { projectOf } from '../../store/selectors';
import { elapsedMs, isRunning, remainingMs } from '../../store/timer';
import type { AppState, Task } from '../../types';
import { ColorDot, ProgressBar } from './primitives';

/** Tarjeta destacada con el pomodoro de la tarea en curso. Solo ella se repinta cada segundo. */
export function FocusTimerCard({ task, state }: { task: Task; state: AppState }) {
  const now = useNow(1000).getTime();
  const { timer, settings } = state;
  const project = projectOf(state, task.projectId);
  const running = isRunning(timer);
  const elapsed = elapsedMs(timer, now);
  const pomodoroMs = settings.pomodoroMinutes * 60_000;

  return (
    <article className="flex flex-col gap-space-sm rounded-xl bg-surface-container-high p-space-md shadow-md" aria-label="Sesión de foco en curso">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-label-sm">
          <ColorDot color={project.color} />
          {project.name}
        </span>
        <span className="rounded bg-primary px-1.5 py-0.5 text-label-caps tracking-wider text-on-primary uppercase">Sesión foco</span>
      </div>
      <h3 className="text-headline-sm font-semibold">{task.title}</h3>
      <div className="flex flex-col gap-2 rounded-lg bg-surface-container-lowest p-space-sm">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-label-sm text-primary">
            {running ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> : <CirclePause size={16} aria-hidden="true" />}
            {running ? 'Deep work' : 'En pausa'} · {settings.pomodoroMinutes} min
          </span>
          <span className="font-mono text-headline-md tracking-wider" role="timer">
            {formatCountdown(remainingMs(timer, settings.pomodoroMinutes, now))}
          </span>
        </div>
        <ProgressBar percent={percentOf(elapsed, pomodoroMs)} className="h-1.5 bg-surface-container-high" />
        <div className="flex items-center justify-between">
          <span className="text-label-sm text-outline">
            Invertido: {formatDuration(task.spentMin + elapsed / 60_000)} / {formatDuration(task.estimateMin)}
          </span>
          <span className="flex gap-1">
            <button
              type="button"
              onClick={running ? actions.pauseTimer : actions.resumeTimer}
              className="icon-btn bg-surface-container"
              aria-label={running ? 'Pausar' : 'Reanudar'}
              title={running ? 'Pausar' : 'Reanudar'}
            >
              {running ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
            </button>
            <button type="button" onClick={actions.stopTimer} className="icon-btn bg-surface-container" aria-label="Terminar sesión y registrar tiempo" title="Terminar sesión y registrar tiempo">
              <Square size={14} aria-hidden="true" />
            </button>
          </span>
        </div>
      </div>
      <button type="button" onClick={() => actions.moveTask(task.id, 'done')} className="btn btn-ghost">
        <CheckCheck size={14} aria-hidden="true" />
        Marcar hecho
      </button>
    </article>
  );
}
