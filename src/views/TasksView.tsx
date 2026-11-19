import { AlarmClock, CalendarCheck, CalendarDays, CalendarOff, CalendarPlus, CheckCircle2, Clock, GripVertical, ListFilter, ListPlus, Plus, X, type LucideIcon } from 'lucide-react';
import { type DragEvent, type ReactNode, useState } from 'react';
import { actions } from '../actions';
import { Picker } from '../components/blocks/Picker';
import { FocusTimerCard } from '../components/ui/FocusTimerCard';
import { ColorDot, EmptyState, EventKindIcon, PageHeader, ToggleButton } from '../components/ui/primitives';
import { TaskCard } from '../components/ui/TaskCard';
import { PRIORITIES } from '../constants';
import { useMinute } from '../hooks/useNow';
import { minutesOfDay, timeToMinutes, todayISO } from '../lib/dates';
import { formatDuration } from '../lib/format';
import type { ViewProps } from '../routes';
import { eventDuration, eventsOn, filterTasks, findTask, logsInRange, projectOf, projectStats, sumMinutes } from '../store/selectors';
import type { AppState, QuickFilter, Task, TaskStatus, UiState } from '../types';

const QUICK: Record<QuickFilter, { label: string; Icon: LucideIcon }> = {
  today: { label: 'Hoy', Icon: CalendarCheck },
  late: { label: 'Atrasadas', Icon: AlarmClock },
  nodate: { label: 'Sin fecha', Icon: CalendarOff },
};

const COLUMNS:{ status: TaskStatus; title: string; dotClass: string }[] = [
  { status: 'todo', title: 'Por hacer', dotClass: 'bg-outline' },
  { status: 'doing', title: 'En progreso (foco)', dotClass: 'bg-primary-container animate-pulse' },
  { status: 'done', title: 'Completadas', dotClass: 'bg-surface-tint' },
];

function Column({
  status,
  title,
  dotClass,
  tasks,
  state,
  today,
  header,
}: (typeof COLUMNS)[number] & { tasks: Task[]; state: AppState; today: string; header?: ReactNode }) {
  const [over, setOver] = useState(false);
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    const id = e.dataTransfer.getData('text/plain');
    if (id) actions.moveTask(id, status);
  };
  return (
    <section
      aria-label={title}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(false);
      }}
      onDrop={onDrop}
      className={`flex min-h-56 flex-col gap-space-sm rounded-xl bg-surface-container-low p-space-md transition-shadow ${over ? 'ring-2 ring-primary/50' : ''}`}
    >
      <div className="flex items-center justify-between pb-1">
        <h2 className="flex items-center gap-space-xs text-headline-sm">
          <span className={`size-2 rounded-full ${dotClass}`} aria-hidden="true" />
          {title}
          <span className="rounded bg-surface-container px-1.5 py-0.5 font-mono text-label-caps text-outline">{tasks.length + (header ? 1 : 0)}</span>
        </h2>
        {status === 'todo' && (
          <button type="button" onClick={() => actions.openDrawer({ type: 'task', defaults: { due: today } })} className="icon-btn" aria-label="Añadir tarea" title="Añadir tarea">
            <Plus size={16} aria-hidden="true" />
          </button>
        )}
      </div>
      {header}
      {tasks.map((t) => (
        <TaskCard key={t.id} task={t} state={state} today={today} />
      ))}
      <p className="flex items-center justify-center gap-1 rounded-lg bg-surface-container-lowest p-space-sm text-label-sm text-outline" aria-hidden="true">
        <GripVertical size={14} />
        Arrastra aquí
      </p>
    </section>
  );
}

function TimeBlocksColumn({ state, now }: { state: AppState; now: Date }) {
  const nowMinutes = minutesOfDay(now);
  const events = eventsOn(state, todayISO(now));
  const nextIndex = events.findIndex((ev) => timeToMinutes(ev.start) > nowMinutes);
  return (
    <section className="flex flex-col gap-space-sm rounded-xl bg-surface-container-low p-space-md" aria-label="Bloques de tiempo de hoy">
      <div className="flex items-center justify-between pb-1">
        <h2 className="flex items-center gap-space-xs text-headline-sm">
          <span className="size-2 rounded-full bg-primary" aria-hidden="true" />
          Bloques de tiempo
          <span className="rounded bg-surface-container px-1.5 py-0.5 font-mono text-label-caps text-outline">Hoy</span>
        </h2>
        <a href="#calendar" className="icon-btn" aria-label="Abrir calendario" title="Abrir calendario">
          <CalendarDays size={16} aria-hidden="true" />
        </a>
      </div>
      {events.length === 0 && <EmptyState>Sin bloques hoy</EmptyState>}
      {events.map((ev, i) => {
        const project = projectOf(state, ev.projectId);
        const past = timeToMinutes(ev.end) <= nowMinutes;
        const current = !past && timeToMinutes(ev.start) <= nowMinutes;
        const isNext = i === nextIndex;
        return (
          <button
            key={ev.id}
            type="button"
            onClick={() => actions.openDrawer({ type: 'event', eventId: ev.id })}
            className={`flex flex-col gap-space-xs rounded-lg p-space-md text-left transition-colors ${past ? 'bg-surface-container/60 opacity-80' : 'bg-surface-container hover:bg-surface-container-high'}`}
          >
            <span className="flex w-full items-center justify-between">
              <span className={`flex items-center gap-1 font-mono text-label-caps ${current || isNext ? 'text-primary' : 'text-outline'}`}>
                {past ? <CheckCircle2 size={13} aria-hidden="true" /> : <Clock size={13} aria-hidden="true" />}
                {ev.start} – {ev.end}
              </span>
              {past ? (
                <span className="rounded bg-surface-container-highest px-1.5 py-0.5 text-label-caps text-secondary">Completado</span>
              ) : current ? (
                <span className="rounded bg-primary px-1.5 py-0.5 text-label-caps text-on-primary">En curso</span>
              ) : isNext ? (
                <span className="rounded bg-primary/20 px-1.5 py-0.5 font-mono text-label-caps text-primary">Siguiente</span>
              ) : (
                <span className="font-mono text-label-caps text-outline">{formatDuration(eventDuration(ev))}</span>
              )}
            </span>
            <span className={`text-body-md font-medium ${past ? 'line-through' : ''}`}>
              <EventKindIcon kind={ev.kind} /> {ev.title}
            </span>
            <span className="flex items-center gap-1 text-label-sm text-on-surface-variant">
              <ColorDot color={project.color} size={6} />
              {project.name}
            </span>
          </button>
        );
      })}
      <button
        type="button"
        onClick={() => actions.openDrawer({ type: 'event' })}
        className="flex items-center justify-center gap-1 rounded-lg bg-surface-container p-space-sm text-label-sm text-outline transition-colors hover:bg-surface-container-high hover:text-on-surface"
      >
        <CalendarPlus size={16} aria-hidden="true" />
        Reservar bloque horario
      </button>
    </section>
  );
}

export function TasksView({ state, ui }: ViewProps) {
  const now = useMinute();
  const today = todayISO(now);
  const activeTask = findTask(state, state.timer.taskId);
  const visible = filterTasks(state, ui, today).filter((t) => t.id !== activeTask?.id);
  const open = state.tasks.filter((t) => t.status !== 'done').length;
  const focusToday = sumMinutes(logsInRange(state, [today, today]));

  return (
    <div className="flex flex-col gap-space-md">
      <PageHeader
        kicker={`${open} abiertas · ${state.tasks.length - open} completadas · foco hoy ${formatDuration(focusToday)}`}
        title="Tareas y bloques de tiempo"
        actions={
          <button type="button" onClick={() => actions.openDrawer({ type: 'task', defaults: { due: today } })} className="btn btn-primary">
            <ListPlus size={16} aria-hidden="true" />
            Nueva tarea
          </button>
        }
      />
      <div className="flex flex-wrap items-center gap-space-sm rounded-xl bg-surface-container-low px-space-md py-space-sm">
        <span className="caps">Carpetas:</span>
        <Picker
          label="Filtrar por carpetas"
          emptyLabel="Todas las carpetas"
          selected={ui.projects}
          onChange={actions.filterProjects}
          options={state.projects.map((p) => ({ id: p.id, label: p.name, sub: `${projectStats(state, p.id).open} abiertas`, color: p.color }))}
        />
        <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Filtros rápidos por fecha">
          {(Object.keys(QUICK) as QuickFilter[]).map((key) => {
            const { label, Icon } = QUICK[key];
            return (
              <ToggleButton key={key} pressed={ui.quick.includes(key)} onClick={() => actions.toggleQuick(key)}>
                <Icon size={14} aria-hidden="true" />
                {label}
              </ToggleButton>
            );
          })}
        </div>
        <span className="flex-1" />
        {ui.query && (
          <button type="button" onClick={() => actions.search('')} className="flex items-center gap-1 rounded-lg bg-surface-container px-space-sm py-1 text-label-sm" aria-label="Quitar búsqueda">
            “{ui.query}”
            <X size={14} aria-hidden="true" />
          </button>
        )}
        <label className="flex items-center gap-1 rounded-lg bg-surface-container px-space-sm py-1">
          <ListFilter size={14} className="text-outline" aria-hidden="true" />
          <span className="sr-only">Prioridad</span>
          <select value={ui.priority} onChange={(e) => actions.filterPriority(e.target.value as UiState['priority'])} className="cursor-pointer bg-transparent text-label-sm outline-none">
            <option value="all">Prioridad: todas</option>
            {Object.entries(PRIORITIES).map(([key, p]) => (
              <option key={key} value={key}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid grid-cols-1 items-start gap-space-md md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((col) => (
          <Column
            key={col.status}
            {...col}
            tasks={visible.filter((t) => t.status === col.status)}
            state={state}
            today={today}
            header={col.status === 'doing' && activeTask ? <FocusTimerCard task={activeTask} state={state} /> : undefined}
          />
        ))}
        <TimeBlocksColumn state={state} now={now} />
      </div>
    </div>
  );
}
