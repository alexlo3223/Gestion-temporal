import { CalendarDays, CalendarRange, ChevronLeft, ChevronRight, Columns3, Plus } from 'lucide-react';
import { type MouseEvent, type ReactNode, useLayoutEffect, useRef } from 'react';
import { actions } from '../actions';
import { ColorDot, EmptyState, EventKindIcon, PageHeader, PriorityBadge, SegmentedControl } from '../components/ui/primitives';
import { TaskRow } from '../components/ui/TaskRow';
import { CALENDAR, EVENT_KINDS } from '../constants';
import { useMinute } from '../hooks/useNow';
import { addDays, minutesOfDay, minutesToTime, monthGridDays, offsetISO, parseISODate, startOfMonth, startOfWeek, timeToMinutes, toISODate, todayISO, weekDays } from '../lib/dates';
import { formatDate } from '../lib/format';
import type { ViewProps } from '../routes';
import { compareByPriority, eventsOn, openTasks, projectOf, tasksDueOn } from '../store/selectors';
import type { AppState, CalendarEvent, CalendarMode } from '../types';

const { firstHour, lastHour, hourHeightPx } = CALENDAR;
const gridHeight = (lastHour - firstHour) * hourHeightPx;
const toPx = (minutes: number) => ((minutes - firstHour * 60) / 60) * hourHeightPx;

const VIEWS: Record<CalendarMode, { label: string; unit: string }> = {
  week: { label: 'Semana', unit: 'Semana' },
  month: { label: 'Mes', unit: 'Mes' },
  projects: { label: 'Por carpeta', unit: 'Día' },
};

const VIEW_OPTIONS = {
  week: (
    <>
      <CalendarRange size={14} aria-hidden="true" />
      Semana
    </>
  ),
  month: (
    <>
      <CalendarDays size={14} aria-hidden="true" />
      Mes
    </>
  ),
  projects: (
    <>
      <Columns3 size={14} aria-hidden="true" />
      Por carpeta
    </>
  ),
};

function EventBlock({ event, state }: { event: CalendarEvent; state: AppState }) {
  const start = Math.max(timeToMinutes(event.start), firstHour * 60);
  const end = Math.min(timeToMinutes(event.end), lastHour * 60);
  if (end <= start) return null;
  const project = projectOf(state, event.projectId);
  const height = toPx(end) - toPx(start);
  const compact = height < 44;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        actions.openDrawer({ type: 'event', eventId: event.id });
      }}
      title={`${event.title} · ${event.start}–${event.end}`}
      className={`absolute inset-x-1 z-10 overflow-hidden rounded-lg border border-border-card bg-surface-container px-2 text-left transition-colors hover:bg-surface-container-high ${compact ? 'flex items-center gap-1 py-0.5' : 'py-1.5'}`}
      style={{ top: toPx(start) + 1, height: height - 2, borderLeft: `3px solid ${project.color}` }}
    >
      <span className="block truncate text-label-md font-semibold">
        <EventKindIcon kind={event.kind} /> {event.title}
      </span>
      <span className="block truncate text-label-sm text-outline tabular-nums">
        {event.start}–{event.end}
      </span>
    </button>
  );
}

/* shortcut: los eventos solapados se dibujan uno encima de otro; calcular carriles si se vuelve habitual */
function DayColumn({
  date,
  events,
  state,
  isToday,
  nowMinutes,
  projectId,
}: {
  date: string;
  events: CalendarEvent[];
  state: AppState;
  isToday: boolean;
  nowMinutes: number;
  /** En la vista por carpeta, el evento nuevo nace en esa carpeta. */
  projectId?: string;
}) {
  const showNow = isToday && nowMinutes >= firstHour * 60 && nowMinutes < lastHour * 60;
  /* clic en un hueco: crea un evento a esa hora (con teclado: botón "Nuevo evento") */
  const createAtSlot = (e: MouseEvent<HTMLDivElement>) => {
    const offsetY = e.clientY - e.currentTarget.getBoundingClientRect().top;
    const hour = Math.min(lastHour - 1, firstHour + Math.floor(offsetY / hourHeightPx));
    actions.openDrawer({ type: 'event', defaults: { date, start: minutesToTime(hour * 60), end: minutesToTime((hour + 1) * 60), projectId } });
  };
  return (
    <div
      onClick={createAtSlot}
      className={`relative cursor-copy border-l border-surface-container-high/40 ${isToday ? 'bg-surface-container-high/10' : ''}`}
      style={{
        height: gridHeight,
        backgroundImage: `repeating-linear-gradient(to bottom,transparent 0 ${hourHeightPx - 1}px,rgb(255 255 255 / 0.05) ${hourHeightPx - 1}px ${hourHeightPx}px)`,
      }}
    >
      {events.map((ev) => (
        <EventBlock key={ev.id} event={ev} state={state} />
      ))}
      {showNow && (
        <div className="pointer-events-none absolute inset-x-0 z-20" style={{ top: toPx(nowMinutes) }} aria-hidden="true">
          <div className="h-[1.5px] bg-error/80" />
          <span className="absolute -top-[3.5px] -left-1 size-2 rounded-full bg-error" />
        </div>
      )}
    </div>
  );
}

function HourAxis() {
  return (
    <div>
      {Array.from({ length: lastHour - firstHour }, (_, i) => (
        <div key={i} className="pt-1 pr-2 text-right text-label-sm text-outline tabular-nums" style={{ height: hourHeightPx }}>
          {minutesToTime((firstHour + i) * 60)}
        </div>
      ))}
    </div>
  );
}

const headCell = 'sticky top-0 z-30 flex flex-col items-center border-b border-l border-surface-container-high/40 bg-surface-container-low py-2.5';

/** Rejilla de horas con una columna por día (semana) o por carpeta (día). */
function TimeGrid({ head, columns, minWidth }: { head: ReactNode; columns: ReactNode; minWidth: number }) {
  const count = Array.isArray(columns) ? columns.length : 1;
  /* empezar cerca de las 8:00 la primera vez */
  const scroller = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    if (scroller.current) scroller.current.scrollTop = hourHeightPx * 1.5;
  }, []);
  const offset = -new Date().getTimezoneOffset() / 60;
  return (
    <div ref={scroller} className="max-h-[calc(100vh-12rem)] overflow-auto">
      <div className="grid" style={{ gridTemplateColumns: `64px repeat(${count},minmax(0,1fr))`, minWidth }}>
        <div className="sticky top-0 z-30 flex items-center justify-center border-b border-surface-container-high/40 bg-surface-container-low">
          <span className="rounded-full bg-surface-container-high px-2 py-0.5 font-mono text-label-caps text-outline">
            UTC{offset >= 0 ? '+' : ''}
            {offset}
          </span>
        </div>
        {head}
        <HourAxis />
        {columns}
      </div>
    </div>
  );
}

function WeekGrid({ state, days, today, nowMinutes }: { state: AppState; days: string[]; today: string; nowMinutes: number }) {
  return (
    <TimeGrid
      minWidth={760}
      head={days.map((d) => (
        <div key={d} className={headCell}>
          <span className={`text-headline-md leading-none font-semibold ${d === today ? 'text-primary' : ''}`}>{formatDate(d, { day: 'numeric' })}</span>
          <span className={`mt-1 text-label-caps tracking-wider uppercase ${d === today ? 'text-primary' : 'text-outline'}`}>{formatDate(d, { weekday: 'short' })}</span>
        </div>
      ))}
      columns={days.map((d) => (
        <DayColumn key={d} date={d} events={eventsOn(state, d)} state={state} isToday={d === today} nowMinutes={nowMinutes} />
      ))}
    />
  );
}

/** Un día con una columna por carpeta, como un tablero de reservas. */
function ProjectsGrid({ state, date, today, nowMinutes }: { state: AppState; date: string; today: string; nowMinutes: number }) {
  const events = eventsOn(state, date);
  if (state.projects.length === 0) return <EmptyState>Crea una carpeta para ver su columna.</EmptyState>;
  return (
    <TimeGrid
      minWidth={Math.max(560, 64 + state.projects.length * 150)}
      head={state.projects.map((p) => (
        <div key={p.id} className={headCell}>
          <span className="flex max-w-full items-center gap-1.5 truncate px-2 text-label-md font-semibold">
            <ColorDot color={p.color} />
            <span className="truncate">{p.name}</span>
          </span>
          <span className="mt-1 text-label-caps text-outline">{events.filter((e) => e.projectId === p.id).length} eventos</span>
        </div>
      ))}
      columns={state.projects.map((p) => (
        <DayColumn key={p.id} date={date} events={events.filter((e) => e.projectId === p.id)} state={state} isToday={date === today} nowMinutes={nowMinutes} projectId={p.id} />
      ))}
    />
  );
}

const MONTH_CHIPS = 3;

/** Mes en rejilla: eventos y tareas que vencen cada día. Pulsar el número abre esa semana. */
function MonthGrid({ state, now, offset, today }: { state: AppState; now: Date; offset: number; today: string }) {
  const days = monthGridDays(now, offset);
  const month = startOfMonth(now, offset).getMonth();
  const thisMonday = startOfWeek(now).getTime();
  const weekOf = (iso: string) => Math.round((startOfWeek(parseISODate(iso)).getTime() - thisMonday) / (7 * 86_400_000));
  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[700px] grid-cols-7">
        {days.slice(0, 7).map((d) => (
          <div key={d} className="border-b border-surface-container-high/40 bg-surface-container-low py-2 text-center text-label-caps tracking-wider text-outline uppercase">
            {formatDate(d, { weekday: 'short' })}
          </div>
        ))}
        {days.map((d) => {
          const outside = parseISODate(d).getMonth() !== month;
          const chips: { key: string; node: ReactNode }[] = [
            ...eventsOn(state, d).map((ev) => {
              const project = projectOf(state, ev.projectId);
              return {
                key: ev.id,
                node: (
                  <button
                    type="button"
                    onClick={() => actions.openDrawer({ type: 'event', eventId: ev.id })}
                    title={`${ev.start}–${ev.end} · ${ev.title} · ${project.name}`}
                    className="flex w-full items-center gap-1 truncate rounded bg-surface-container px-1.5 py-0.5 text-left text-label-sm hover:bg-surface-container-high"
                    style={{ borderLeft: `3px solid ${project.color}` }}
                  >
                    <EventKindIcon kind={ev.kind} />
                    <span className="truncate">{ev.title}</span>
                  </button>
                ),
              };
            }),
            ...tasksDueOn(state, d)
              .filter((t) => t.status !== 'done')
              .map((t) => ({
                key: t.id,
                node: (
                  <button
                    type="button"
                    onClick={() => actions.openDrawer({ type: 'task', taskId: t.id })}
                    title={`Vence: ${t.title}`}
                    className="flex w-full items-center gap-1 truncate rounded px-1 py-0.5 text-left text-label-sm text-on-surface-variant hover:bg-surface-container"
                  >
                    <PriorityBadge priority={t.priority} />
                    <span className="truncate">{t.title}</span>
                  </button>
                ),
              })),
          ];
          return (
            <div key={d} className={`flex min-h-28 flex-col gap-0.5 border-b border-l border-surface-container-high/40 p-1 ${outside ? 'opacity-45' : ''} ${d === today ? 'bg-surface-container-high/10' : ''}`}>
              <button
                type="button"
                onClick={() => actions.setCalendarView('week', weekOf(d))}
                className={`self-end rounded-full px-1.5 text-label-md tabular-nums hover:bg-surface-container-high ${d === today ? 'bg-primary font-semibold text-on-primary hover:bg-primary-hover' : ''}`}
                aria-label={`Ver la semana del ${formatDate(d, { day: 'numeric', month: 'long' })}`}
              >
                {formatDate(d, { day: 'numeric' })}
              </button>
              {chips.slice(0, MONTH_CHIPS).map((c) => (
                <div key={c.key}>{c.node}</div>
              ))}
              {chips.length > MONTH_CHIPS && <span className="px-1 text-label-caps text-outline">+{chips.length - MONTH_CHIPS} más</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PendingPane({ state, now }: { state: AppState; now: Date }) {
  const today = todayISO(now);
  const weekEnd = toISODate(addDays(startOfWeek(now), 6));
  const pending = openTasks(state).sort(compareByPriority);
  const groups: [string, (due: string) => boolean][] = [
    ['Hoy y atrasadas', (due) => !!due && due <= today],
    ['Esta semana', (due) => due > today && due <= weekEnd],
    ['Más adelante', (due) => due > weekEnd],
    ['Sin fecha', (due) => !due],
  ];
  return (
    <aside className="hidden max-h-[calc(100vh-12rem)] w-72 shrink-0 flex-col overflow-hidden rounded-xl bg-surface-container-lowest lg:flex" aria-labelledby="pending-title">
      <div className="flex items-center justify-between border-b border-surface-container-high/40 p-space-md">
        <h2 id="pending-title" className="text-headline-sm font-semibold">
          Pendientes
        </h2>
        <button type="button" onClick={() => actions.openDrawer({ type: 'task', defaults: { due: today } })} className="icon-btn" aria-label="Nueva tarea" title="Nueva tarea">
          <Plus size={16} aria-hidden="true" />
        </button>
      </div>
      <div className="flex flex-1 flex-col gap-space-md overflow-y-auto p-space-sm">
        {pending.length === 0 && <EmptyState>Nada pendiente</EmptyState>}
        {groups.map(([label, matches]) => {
          const tasks = pending.filter((t) => matches(t.due));
          if (!tasks.length) return null;
          return (
            <div key={label}>
              <h3 className="caps px-2 py-1">
                {label} · {tasks.length}
              </h3>
              {tasks.map((t) => (
                <TaskRow key={t.id} task={t} state={state} today={today} />
              ))}
            </div>
          );
        })}
      </div>
    </aside>
  );
}

export function CalendarView({ state, ui }: ViewProps) {
  const now = useMinute();
  const today = todayISO(now);
  const nowMinutes = minutesOfDay(now);
  const { calendarView: view, calendarOffset: offset } = ui;
  const days = weekDays(now, offset);
  const day = offsetISO(offset, now);

  const range =
    view === 'month'
      ? formatDate(toISODate(startOfMonth(now, offset)), { month: 'long', year: 'numeric' })
      : view === 'projects'
        ? formatDate(day, { weekday: 'long', day: 'numeric', month: 'long' })
        : `${formatDate(days[0], { day: 'numeric', month: 'short' })} – ${formatDate(days[6], { day: 'numeric', month: 'short', year: 'numeric' })}`;
  const unit = VIEWS[view].unit.toLowerCase();

  return (
    <div className="flex flex-col gap-space-md">
      <PageHeader
        kicker={<span className="first-letter:uppercase">{range}</span>}
        title="Calendario"
        actions={
          <>
            <SegmentedControl label="Vista del calendario" options={VIEW_OPTIONS} value={view} onChange={(v) => actions.setCalendarView(v)} />
            <div className="flex items-center rounded-lg bg-surface-container-low p-0.5" role="group" aria-label={`Cambiar ${unit}`}>
              <button type="button" onClick={() => actions.shiftCalendar(-1)} className="icon-btn" aria-label={`${VIEWS[view].unit} anterior`}>
                <ChevronLeft size={18} aria-hidden="true" />
              </button>
              <button type="button" onClick={() => actions.shiftCalendar(0)} className={`rounded px-space-sm py-1 text-label-md hover:bg-surface-container-high ${offset === 0 ? 'bg-surface-container-high' : ''}`}>
                Hoy
              </button>
              <button type="button" onClick={() => actions.shiftCalendar(1)} className="icon-btn" aria-label={`${VIEWS[view].unit} siguiente`}>
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            </div>
            <button type="button" onClick={() => actions.openDrawer({ type: 'event', defaults: view === 'week' ? undefined : { date: day } })} className="btn btn-primary">
              <Plus size={16} aria-hidden="true" />
              Nuevo evento
            </button>
          </>
        }
      />
      <div className="flex items-start gap-space-md">
        <PendingPane state={state} now={now} />
        <section className="min-w-0 flex-1 overflow-hidden rounded-xl bg-surface-container-lowest" aria-label={`${VIEWS[view].label}: ${range}`}>
          {view === 'week' && <WeekGrid state={state} days={days} today={today} nowMinutes={nowMinutes} />}
          {view === 'month' && <MonthGrid state={state} now={now} offset={offset} today={today} />}
          {view === 'projects' && <ProjectsGrid state={state} date={day} today={today} nowMinutes={nowMinutes} />}
          <div className="flex flex-wrap items-center justify-between gap-space-sm border-t border-surface-container-high/40 px-space-md py-space-sm text-label-sm text-outline">
            <p>{view === 'month' ? 'Pulsa un número para abrir esa semana · clic en un evento o tarea para editarlo' : 'Haz clic en un hueco para crear un evento · clic en un evento para editarlo'}</p>
            <ul className="flex flex-wrap gap-space-sm" aria-label="Tipos de evento">
              {Object.values(EVENT_KINDS).map((k) => (
                <li key={k.label} className="flex items-center gap-1">
                  <k.Icon size={13} aria-hidden="true" /> {k.label}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
