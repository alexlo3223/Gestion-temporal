import {
  CalendarDays,
  CheckCircle2,
  Clock,
  FolderOpen,
  Gauge,
  ListTodo,
  Check,
  LayoutGrid,
  Pencil,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  SquareCheck,
  Brain,
  Timer,
  ChartGantt,
  Users,
} from 'lucide-react';
import { Fragment, type ReactNode, useState } from 'react';
import { actions } from '../actions';
import { ColorDot, EmptyState, EventKindIcon, MetricCard } from '../components/ui/primitives';
import { ProjectNode } from '../components/ui/ProjectNode';
import { TaskRow } from '../components/ui/TaskRow';
import { WidgetGrid } from '../components/ui/WidgetGrid';
import { EVENT_KINDS, TIMEZONES } from '../constants';
import { useMinute } from '../hooks/useNow';
import { minutesOfDay, minutesToTime, timeToMinutes, todayISO, weekRange } from '../lib/dates';
import { formatClock, formatDate, formatDuration, percentOf } from '../lib/format';
import type { ViewProps } from '../routes';
import { resolveHomeLayout } from '../store/layout';
import { compareByPriority, eventDuration, eventsOn, logsInRange, openTasks, projectOf, projectStats, sumDurations, sumMinutes } from '../store/selectors';
import type { AppState, CalendarEvent, HomeWidgetId, Settings } from '../types';

function greeting(hour: number) {
  if (hour < 13) return 'Buenos días';
  if (hour < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

function ClockPod({ settings, now }: { settings: Settings; now: Date }) {
  return (
    <div className="flex items-center gap-space-xs self-start rounded-xl bg-surface-container-low p-1.5 lg:self-auto">
      <div className="flex items-center gap-space-sm rounded-lg bg-surface-container px-space-md py-space-xs">
        <span className="size-2 animate-pulse rounded-full bg-primary" aria-hidden="true" />
        <div>
          <p className="text-headline-sm font-semibold tabular-nums">{formatClock(now)}</p>
          <p className="text-label-sm text-on-surface-variant">Local</p>
        </div>
      </div>
      <span className="px-1 text-outline-variant" aria-hidden="true">
        ⇄
      </span>
      <div className="flex items-center gap-space-sm px-space-md py-space-xs">
        <Clock size={16} className="text-outline" aria-hidden="true" />
        <div>
          <p className="text-headline-sm text-on-surface-variant tabular-nums">{formatClock(now, settings.secondTimezone)}</p>
          <p className="text-label-sm text-outline">{TIMEZONES[settings.secondTimezone]}</p>
        </div>
      </div>
      <a href="#settings" className="icon-btn" aria-label="Cambiar zona horaria" title="Cambiar zona horaria">
        <SlidersHorizontal size={18} aria-hidden="true" />
      </a>
    </div>
  );
}

function Spotlight({ event, state, nowMinutes }: { event?: CalendarEvent; state: AppState; nowMinutes: number }) {
  if (!event) {
    return (
      <section className="card flex flex-col items-start gap-space-sm p-space-lg">
        <p className="caps">Agenda</p>
        <h2 className="text-headline-md font-semibold">No quedan eventos hoy</h2>
        <p className="text-body-sm text-outline">Buen momento para un bloque de foco.</p>
        <button type="button" onClick={() => actions.openDrawer({ type: 'event' })} className="btn btn-primary">
          <Plus size={16} aria-hidden="true" />
          Reservar bloque
        </button>
      </section>
    );
  }
  const project = projectOf(state, event.projectId);
  const started = timeToMinutes(event.start) <= nowMinutes;
  const countdown = started ? `Termina en ${formatDuration(timeToMinutes(event.end) - nowMinutes)}` : `Empieza en ${formatDuration(timeToMinutes(event.start) - nowMinutes)}`;
  return (
    <section className="card flex flex-col gap-space-md p-space-lg" aria-label="Próximo evento">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-0.5 text-label-caps tracking-wider text-primary uppercase">
          <span className={`size-1.5 rounded-full bg-primary ${started ? 'animate-pulse' : 'animate-ping'}`} aria-hidden="true" />
          {started ? 'En curso' : 'En breve'}
        </span>
        <span className="flex items-center gap-1 rounded bg-surface-container px-space-sm py-1 font-mono text-label-caps text-primary uppercase">
          <Timer size={13} aria-hidden="true" />
          {countdown}
        </span>
      </div>
      <div>
        <p className="flex items-center gap-2 text-label-sm" style={{ color: project.color }}>
          <ColorDot color={project.color} size={10} />
          {project.name}
        </p>
        <h2 className="mt-1 text-headline-md font-semibold tracking-tight">
          <EventKindIcon kind={event.kind} /> {event.title}
        </h2>
        <p className="mt-1 flex items-center gap-1 text-body-sm text-on-surface-variant">
          <Clock size={15} className="text-outline" aria-hidden="true" />
          {event.start} – {event.end} ({formatDuration(eventDuration(event))}) · {EVENT_KINDS[event.kind].label}
        </p>
      </div>
      <div className="flex gap-space-sm">
        <a href="#calendar" className="btn btn-primary flex-1 py-2.5">
          <CalendarDays size={16} aria-hidden="true" />
          Ver en calendario
        </a>
        <button type="button" onClick={() => actions.openDrawer({ type: 'event', eventId: event.id })} className="btn btn-ghost" aria-label="Editar evento" title="Editar evento">
          <Pencil size={16} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

function NowMarker({ nowMinutes }: { nowMinutes: number }) {
  return (
    <li className="flex items-center gap-1 pl-16" aria-hidden="true">
      <span className="-ml-1 size-2.5 rounded-full bg-primary" />
      <span className="h-0.5 flex-1 bg-primary/70" />
      <span className="rounded bg-primary px-1 font-mono text-label-caps text-on-primary">AHORA {minutesToTime(nowMinutes)}</span>
    </li>
  );
}

function DayTimeline({ events, state, nowMinutes }: { events: CalendarEvent[]; state: AppState; nowMinutes: number }) {
  const firstUpcoming = events.findIndex((ev) => timeToMinutes(ev.start) > nowMinutes);
  const { workStart, workEnd } = state.settings;
  return (
    <section className="card flex flex-col gap-space-md" aria-labelledby="timeline-title">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-space-sm">
          <ChartGantt size={20} className="text-primary" aria-hidden="true" />
          <div>
            <h2 id="timeline-title" className="text-headline-sm font-semibold">
              Línea de tiempo del día
            </h2>
            <p className="text-label-sm text-outline">
              Horas operativas: {minutesToTime(workStart * 60)} – {minutesToTime(workEnd * 60)}
            </p>
          </div>
        </div>
        <button type="button" onClick={() => actions.openDrawer({ type: 'event' })} className="icon-btn" aria-label="Añadir bloque" title="Añadir bloque">
          <Plus size={18} aria-hidden="true" />
        </button>
      </div>
      {events.length === 0 ? (
        <EmptyState>Sin eventos hoy</EmptyState>
      ) : (
        <ol className="flex flex-col gap-3">
          {events.map((ev, i) => {
            const project = projectOf(state, ev.projectId);
            const past = timeToMinutes(ev.end) <= nowMinutes;
            const current = !past && timeToMinutes(ev.start) <= nowMinutes;
            return (
              <Fragment key={ev.id}>
                {i === firstUpcoming && <NowMarker nowMinutes={nowMinutes} />}
                <li className={`flex items-start gap-space-md transition-opacity ${past ? 'opacity-60 hover:opacity-100' : ''}`}>
                  <span className={`w-12 shrink-0 pt-2 text-right font-mono text-label-sm ${current ? 'text-primary' : 'text-outline'}`}>{ev.start}</span>
                  <button
                    type="button"
                    onClick={() => actions.openDrawer({ type: 'event', eventId: ev.id })}
                    className={`flex min-w-0 flex-1 items-center justify-between gap-2 rounded-lg p-space-sm text-left transition-colors ${current ? 'bg-surface-container-high shadow-md' : 'bg-surface-container/60 hover:bg-surface-container'}`}
                  >
                    <span className="flex min-w-0 items-center gap-space-sm">
                      <span
                        className="min-h-8 w-1.5 shrink-0 self-stretch rounded-full"
                        style={{
                          background: past ? 'var(--color-outline)' : project.color,
                        }}
                        aria-hidden="true"
                      />
                      <span className="min-w-0">
                        <span className={`block truncate text-body-sm font-medium ${past ? 'line-through' : ''}`}>
                          <EventKindIcon kind={ev.kind} /> {ev.title}
                        </span>
                        <span className="block truncate text-label-sm text-outline">
                          {ev.start} – {ev.end} · {project.name}
                        </span>
                      </span>
                    </span>
                    {past && <CheckCircle2 size={16} className="text-outline" aria-label="Terminado" />}
                    {current && <span className="shrink-0 rounded bg-primary px-space-xs py-0.5 text-label-caps text-on-primary">En curso</span>}
                  </button>
                </li>
              </Fragment>
            );
          })}
          {firstUpcoming === -1 && <NowMarker nowMinutes={nowMinutes} />}
        </ol>
      )}
    </section>
  );
}

export function HomeView({ state }: ViewProps) {
  const now = useMinute();
  const { settings } = state;
  const [editing, setEditing] = useState(false);
  const layout = resolveHomeLayout(settings.homeLayout);
  const today = todayISO(now);
  const nowMinutes = minutesOfDay(now);
  const events = eventsOn(state, today);
  const meetings = events.filter((ev) => ev.kind === 'reunion');
  const meetingMinutes = sumDurations(meetings);
  const focusPlanned = sumDurations(events.filter((ev) => ev.kind === 'foco'));
  const focusToday = sumMinutes(logsInRange(state, [today, today]));
  const dueToday = state.tasks.filter((t) => t.due && t.due <= today && (t.status !== 'done' || t.doneAt === today));
  const doneToday = dueToday.filter((t) => t.status === 'done').length;
  const weekFocus = sumMinutes(logsInRange(state, weekRange(now)));
  const weekGoal = settings.weeklyGoalHours * 60;
  const pendingMeetings = meetings.filter((ev) => timeToMinutes(ev.start) > nowMinutes).length;
  const nextEvent = events.find((ev) => timeToMinutes(ev.end) > nowMinutes);
  const pending = openTasks(state).sort(compareByPriority);
  const busiest = [...state.projects].sort((a, b) => projectStats(state, b.id).open - projectStats(state, a.id).open).slice(0, 3);

  const widgets: Record<HomeWidgetId, ReactNode> = {
    meetings: (
      <MetricCard
        label="Tiempo en reuniones"
        value={formatDuration(meetingMinutes)}
        Icon={Users}
        footer={`${meetings.length} eventos hoy`}
        percent={percentOf(meetingMinutes, (settings.workEnd - settings.workStart) * 60)}
      />
    ),
    focusToday: (
      <MetricCard
        label="Foco registrado hoy"
        value={formatDuration(focusToday)}
        Icon={Brain}
        footer={`${formatDuration(focusPlanned)} planificado`}
        highlight={focusPlanned ? `${Math.round(percentOf(focusToday, focusPlanned))}%` : undefined}
        percent={percentOf(focusToday, focusPlanned)}
        barClass="bg-primary-container"
      />
    ),
    tasksToday: (
      <MetricCard
        label="Tareas de hoy"
        value={
          <>
            {doneToday} <span className="text-headline-sm text-outline">/ {dueToday.length}</span>
          </>
        }
        Icon={SquareCheck}
        footer={`${dueToday.length - doneToday} restantes`}
        highlight={dueToday.length ? `${Math.round(percentOf(doneToday, dueToday.length))}%` : '—'}
        percent={percentOf(doneToday, dueToday.length)}
        barClass="bg-on-surface"
      />
    ),
    focusWeek: (
      <MetricCard
        label="Foco esta semana"
        value={formatDuration(weekFocus)}
        Icon={Gauge}
        footer={`Meta: ${settings.weeklyGoalHours}h`}
        highlight={`${Math.round(percentOf(weekFocus, weekGoal))}%`}
        percent={percentOf(weekFocus, weekGoal)}
      />
    ),
    spotlight: <Spotlight event={nextEvent} state={state} nowMinutes={nowMinutes} />,
    timeline: <DayTimeline events={events} state={state} nowMinutes={nowMinutes} />,
    priorities: (
      <section className="card flex flex-col gap-space-sm" aria-labelledby="priorities-title">
        <div className="flex items-center justify-between">
          <h2 id="priorities-title" className="flex items-center gap-space-xs text-headline-sm font-semibold">
            <ListTodo size={18} className="text-primary" aria-hidden="true" />
            Prioridades
          </h2>
          <a href="#tasks" className="text-label-sm text-primary hover:underline">
            Ver todas ({pending.length})
          </a>
        </div>
        <div className="flex flex-col gap-0.5">
          {pending.length ? pending.slice(0, 6).map((t) => <TaskRow key={t.id} task={t} state={state} today={today} />) : <EmptyState>Todo al día</EmptyState>}
        </div>
      </section>
    ),
    projects: (
      <section className="flex flex-col gap-space-xs" aria-labelledby="home-projects-title">
        <div className="flex items-center justify-between">
          <h2 id="home-projects-title" className="flex items-center gap-space-xs text-headline-sm font-semibold">
            <FolderOpen size={18} className="text-primary" aria-hidden="true" />
            Proyectos en ejecución
          </h2>
          <a href="#projects" className="text-label-sm text-primary hover:underline">
            Ver carpetas
          </a>
        </div>
        <div className="grid grid-cols-1 gap-x-14 pr-12 md:grid-cols-3">
          {busiest.map((p) => (
            <ProjectNode key={p.id} project={p} state={state} today={today} />
          ))}
        </div>
      </section>
    ),
  };

  return (
    <div className="flex flex-col gap-space-lg">
      <section className="flex flex-col justify-between gap-space-md lg:flex-row lg:items-end">
        <div className="flex flex-col gap-1">
          <p className="flex items-center gap-space-xs">
            <span className="caps font-mono text-primary">Overview diario</span>
            <span className="size-1 rounded-full bg-outline" aria-hidden="true" />
            <span className="text-label-sm text-outline first-letter:uppercase">
              {formatDate(today, {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </span>
          </p>
          <h1 className="text-headline-xl-mobile tracking-tight md:text-headline-xl">
            {greeting(now.getHours())}, {settings.name}
          </h1>
          <p className="text-body-md text-on-surface-variant">
            Tienes{' '}
            <span className="font-medium text-primary">
              {pendingMeetings} {pendingMeetings === 1 ? 'reunión' : 'reuniones'}
            </span>{' '}
            pendientes y <span className="font-medium text-on-surface">{formatDuration(focusPlanned)}</span> reservadas para trabajo de foco.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-space-sm self-start lg:self-auto">
          {editing && settings.homeLayout && (
            <button type="button" onClick={actions.resetHomeLayout} className="btn btn-ghost">
              <RotateCcw size={16} aria-hidden="true" />
              Restablecer
            </button>
          )}
          <button type="button" onClick={() => setEditing(!editing)} aria-pressed={editing} className={editing ? 'btn btn-primary' : 'btn btn-ghost'}>
            {editing ? <Check size={16} aria-hidden="true" /> : <LayoutGrid size={16} aria-hidden="true" />}
            {editing ? 'Listo' : 'Personalizar'}
          </button>
          <ClockPod settings={settings} now={now} />
        </div>
      </section>
      {editing && (
        <p className="-mt-space-sm text-body-sm text-outline">
          Arrastra cada bloque a cualquier celda: los huecos que dejes se respetan y si cae encima de otro, ese baja. También puedes usar las flechas, y con − y + cambias cuántas columnas ocupa. Se guarda solo.
        </p>
      )}

      <WidgetGrid layout={layout} editing={editing} onChange={actions.setHomeLayout} render={(id) => widgets[id]} />
    </div>
  );
}
