// Consultas puras sobre el estado. No modifican nada.
import { ME_ID, PRIORITIES, UNASSIGNED_PROJECT } from '../constants';
import { daysBetween, isInRange, lastDaysRange, minutesToTime, offsetISO, parseISODate, timeToMinutes, todayISO, weekRange } from '../lib/dates';
import { formatDate } from '../lib/format';
import type { AppState, CalendarEvent, DateRange, DocKind, FocusLog, Member, Period, QuickFilter, Task, UiState } from '../types';

export const findTask = (state: AppState, id: string | null | undefined) => state.tasks.find((t) => t.id === id);
export const findEvent = (state: AppState, id: string | undefined) => state.events.find((e) => e.id === id);
export const findProject = (state: AppState, id: string | undefined) => state.projects.find((p) => p.id === id);
export const projectOf = (state: AppState, id: string) => findProject(state, id) ?? UNASSIGNED_PROJECT;

export const openTasks = (state: AppState) => state.tasks.filter((t) => t.status !== 'done');

export const compareByPriority = (a: Task, b: Task) =>
  PRIORITIES[a.priority].weight - PRIORITIES[b.priority].weight || (a.due || '9999').localeCompare(b.due || '9999');

const QUICK_FILTERS: Record<QuickFilter, (task: Task, today: string) => boolean> = {
  today: (t, today) => t.due === today,
  late: (t, today) => t.status !== 'done' && !!t.due && t.due < today,
  nodate: (t) => !t.due,
};

export function filterTasks(
  state: AppState,
  { projects, priority, query, quick = [] }: Pick<UiState, 'projects' | 'priority' | 'query'> & { quick?: QuickFilter[] },
  today = todayISO(),
) {
  const needle = query.trim().toLowerCase();
  return state.tasks
    .filter((t) => projects.length === 0 || projects.includes(t.projectId))
    .filter((t) => priority === 'all' || t.priority === priority)
    .filter((t) => !needle || `${t.title} ${t.description}`.toLowerCase().includes(needle))
    .filter((t) => quick.length === 0 || quick.some((q) => QUICK_FILTERS[q](t, today)))
    .sort(compareByPriority);
}

/** Tareas sin hacer que vencen hoy o ya vencieron. */
export const dueNowCount = (state: AppState, today: string) => state.tasks.filter((t) => t.status !== 'done' && t.due && t.due <= today).length;

export const tasksDueOn = (state: AppState, date: string) => state.tasks.filter((t) => t.due === date).sort(compareByPriority);

/**
 * Franjas de `step` minutos de la jornada para empezar un evento de `duration` minutos.
 * Una franja está libre si el evento cabe antes del fin de jornada sin solaparse con otro
 * del mismo día (`ignoreId` excluye el evento que se está editando).
 */
export function daySlots(state: AppState, date: string, { duration, step = 30, ignoreId }: { duration: number; step?: number; ignoreId?: string }) {
  const { workStart, workEnd } = state.settings;
  const busy = eventsOn(state, date)
    .filter((e) => e.id !== ignoreId)
    .map((e) => [timeToMinutes(e.start), timeToMinutes(e.end)]);
  const slots: { time: string; free: boolean }[] = [];
  for (let m = workStart * 60; m < workEnd * 60; m += step) {
    const end = m + duration;
    const free = end <= workEnd * 60 && busy.every(([s, e]) => end <= s || m >= e);
    slots.push({ time: minutesToTime(m), free });
  }
  return slots;
}

export interface GanttBar {
  task: Task;
  /** Columna (día) donde empieza, relativa al primer día visible; puede ser negativa. */
  start: number;
  /** Días que ocupa; 0 = hito. */
  span: number;
}

/**
 * Barras del cronograma: cada tarea abierta con fecha termina el día de su fecha límite y
 * dura lo que su estimación en jornadas (mín. 1 día); sin estimación es un hito.
 * Solo las que se ven en los `days` días desde `from`.
 */
export function ganttBars(state: AppState, from: string, days: number): GanttBar[] {
  const workday = Math.max(60, (state.settings.workEnd - state.settings.workStart) * 60);
  return openTasks(state)
    .filter((t) => t.due)
    .map((task) => {
      const span = task.estimateMin ? Math.ceil(task.estimateMin / workday) : 0;
      const end = daysBetween(from, task.due);
      return { task, start: end - Math.max(span, 1) + 1, span };
    })
    .filter((b) => b.start < days && b.start + Math.max(b.span, 1) > 0)
    .sort((a, b) => a.start - b.start || compareByPriority(a.task, b.task));
}

export const eventDuration = (event: CalendarEvent) => Math.max(0, timeToMinutes(event.end) - timeToMinutes(event.start));
export const sumDurations = (events: CalendarEvent[]) => events.reduce((total, e) => total + eventDuration(e), 0);

export const eventsOn = (state: AppState, date: string) =>
  state.events.filter((e) => e.date === date).sort((a, b) => a.start.localeCompare(b.start));

export const eventsInRange = (state: AppState, range: DateRange) => state.events.filter((e) => isInRange(e.date, range));

export const logsInRange = (state: AppState, range: DateRange) => state.logs.filter((l) => isInRange(l.date, range));
export const sumMinutes = (logs: FocusLog[]) => logs.reduce((total, l) => total + l.minutes, 0);

/** Rango de un periodo de analíticas: 'week' (semana actual) o 'month' (últimos 30 días). */
export const periodRange = (period: Period, now = new Date()) => (period === 'month' ? lastDaysRange(30, now) : weekRange(now));

export function projectStats(state: AppState, projectId: string) {
  const tasks = state.tasks.filter((t) => t.projectId === projectId);
  const done = tasks.filter((t) => t.status === 'done').length;
  const nextDue = tasks.filter((t) => t.status !== 'done' && t.due).sort((a, b) => a.due.localeCompare(b.due))[0];
  return {
    total: tasks.length,
    done,
    open: tasks.length - done,
    percent: tasks.length ? Math.round((done / tasks.length) * 100) : 0,
    minutes: sumMinutes(state.logs.filter((l) => l.projectId === projectId)),
    nextDue: nextDue ?? null,
  };
}

export interface FocusBar {
  label: string;
  short: string;
  /** Minutos de foco por carpeta, en el orden de `state.projects`. */
  values: number[];
  /** Tareas completadas en el periodo. */
  below: number;
}

function focusBar(state: AppState, range: DateRange, label: string, short: string): FocusBar {
  const logs = logsInRange(state, range);
  return {
    label,
    short,
    values: state.projects.map((p) => sumMinutes(logs.filter((l) => l.projectId === p.id))),
    below: state.tasks.filter((t) => t.doneAt && isInRange(t.doneAt, range)).length,
  };
}

/** Foco por carpeta de los últimos `days` días, del más antiguo al de hoy. */
export function dailyFocus(state: AppState, days: number, now = new Date()) {
  return Array.from({ length: days }, (_, i) => {
    const date = offsetISO(i - (days - 1), now);
    return focusBar(state, [date, date], formatDate(date, { weekday: 'short', day: 'numeric', month: 'short' }), formatDate(date, { day: 'numeric', month: 'short' }));
  });
}

/** Foco por carpeta de las últimas `weeks` semanas, de la más antigua a la actual. */
export function weeklyFocus(state: AppState, weeks: number, now = new Date()) {
  return Array.from({ length: weeks }, (_, i) => {
    const range = weekRange(now, i - (weeks - 1));
    const short = formatDate(range[0], { day: 'numeric', month: 'short' });
    return focusBar(state, range, `${short} – ${formatDate(range[1], { day: 'numeric', month: 'short' })}`, short);
  });
}


// ---------- participantes, chat y documentos de una carpeta ----------

/** Quien habla cuando el autor ya no participa en la carpeta. */
const FORMER_MEMBER: Member = { id: '', name: 'Ex participante', color: '#71717a' };

/** El usuario (siempre primero) y los participantes de la carpeta. */
export const membersOf = (state: AppState, projectId: string): Member[] => [
  { id: ME_ID, name: state.settings.name, color: '#a5b4fc' },
  ...(findProject(state, projectId)?.members ?? []),
];
export const authorOf = (state: AppState, projectId: string, authorId: string): Member => membersOf(state, projectId).find((m) => m.id === authorId) ?? FORMER_MEMBER;
export const messagesOf = (state: AppState, projectId: string) => state.messages.filter((m) => m.projectId === projectId).sort((a, b) => a.at - b.at);
export const docsOf = (state: AppState, projectId: string, kind?: DocKind) => state.docs.filter((d) => d.projectId === projectId && (!kind || d.kind === kind)).sort((a, b) => b.updatedAt - a.updatedAt);

/**
 * Rango de una tarea para el gantt: termina el día de su fecha límite y empieza en `start`; sin él, dura lo que su
 * estimación en jornadas (mín. 1 día). Sin fecha límite devuelve null.
 */
export function taskRange(state: AppState, task: Task): { start: string; end: string } | null {
  if (!task.due) return null;
  if (task.start) return { start: task.start, end: task.due };
  if (!task.estimateMin) return { start: task.due, end: task.due }; // hito: sin estimación, es un día que se marca
  const workday = Math.max(60, (state.settings.workEnd - state.settings.workStart) * 60);
  const days = Math.max(1, task.estimateMin ? Math.ceil(task.estimateMin / workday) : 1);
  return { start: offsetISO(1 - days, parseISODate(task.due)), end: task.due };
}
