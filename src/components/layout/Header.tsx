import { Bell, BellOff, CalendarPlus, FolderPlus, ListPlus, Menu, Pause, Timer } from 'lucide-react';
import { actions } from '../../actions';
import { useNow } from '../../hooks/useNow';
import { todayISO } from '../../lib/dates';
import { formatCountdown } from '../../lib/format';
import { dueNowCount, findTask } from '../../store/selectors';
import { isRunning, remainingMs } from '../../store/timer';
import type { AppState, UiState } from '../../types';
import { Create } from '../blocks/Create';

/** Cuenta atrás del pomodoro en curso. Solo este componente se repinta cada segundo. */
function TimerChip({ state }: { state: AppState }) {
  const now = useNow(1000).getTime();
  const task = findTask(state, state.timer.taskId);
  if (!task) return null;
  const running = isRunning(state.timer);
  const countdown = formatCountdown(remainingMs(state.timer, state.settings.pomodoroMinutes, now));
  return (
    <a
      href="#tasks"
      className="flex max-w-[220px] items-center gap-space-xs rounded-lg bg-surface-container-low px-space-sm py-1.5"
      aria-label={`Sesión de foco: ${task.title}. Quedan ${countdown}${running ? '' : ' (en pausa)'}`}
    >
      {running ? <Timer size={16} className="text-primary" aria-hidden="true" /> : <Pause size={16} className="text-primary" aria-hidden="true" />}
      <span className="hidden truncate text-label-sm text-on-surface-variant sm:inline">{task.title}</span>
      <span className="font-mono text-label-md text-primary">{countdown}</span>
    </a>
  );
}

/** Silencia o activa el aviso del pomodoro; el número son las tareas para hoy o atrasadas. */
function NotifyBell({ state }: { state: AppState }) {
  const on = state.settings.notify;
  const due = dueNowCount(state, todayISO());
  const label = `${on ? 'Silenciar' : 'Activar'} avisos del pomodoro${due ? ` · ${due} tareas para hoy o atrasadas` : ''}`;
  return (
    <button type="button" onClick={actions.toggleNotify} aria-pressed={on} aria-label={label} title={label} className="icon-btn relative p-1.5">
      {on ? <Bell size={18} aria-hidden="true" /> : <BellOff size={18} aria-hidden="true" />}
      {on && due > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-error-container px-1 font-mono text-[10px] leading-none text-on-error-container" aria-hidden="true">
          {due > 9 ? '9+' : due}
        </span>
      )}
    </button>
  );
}

export function Header({ title, state, ui }: { title: string; state: AppState; ui: UiState }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-surface-container-high/40 bg-surface/90 px-space-md backdrop-blur-xl lg:px-space-lg">
      <div className="flex min-w-0 items-center gap-space-sm">
        <button
          type="button"
          onClick={() => actions.setMenu(!ui.menuOpen)}
          className="icon-btn lg:hidden"
          aria-label={ui.menuOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={ui.menuOpen}
          aria-controls="sidebar"
        >
          <Menu size={22} aria-hidden="true" />
        </button>
        <img src="/favicon.svg" alt="" width={22} height={22} className="shrink-0 rounded-md" />
        <span className="truncate text-label-md text-on-surface-variant">{title}</span>
      </div>
      <div className="flex items-center gap-space-sm">
        <TimerChip state={state} />
        <NotifyBell state={state} />
        <Create
          items={[
            { label: 'Tarea', Icon: ListPlus, onSelect: () => actions.openDrawer({ type: 'task', defaults: { due: todayISO() } }) },
            { label: 'Evento', Icon: CalendarPlus, onSelect: () => actions.openDrawer({ type: 'event' }) },
            { label: 'Carpeta', Icon: FolderPlus, onSelect: () => actions.openDrawer({ type: 'project' }) },
          ]}
        />
      </div>
    </header>
  );
}
