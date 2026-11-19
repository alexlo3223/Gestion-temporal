// Traduce eventos y tareas al modelo del calendario de ReUI y los movimientos de vuelta a la app.
import type { CalendarEvent as RCalendarEvent, EventCalendarResource } from '@/components/reui/event-calendar/event-calendar-types';
import type { AppState } from '../types';
import { addDays, minutesToTime, parseISODate, timeToMinutes, toISODate } from './dates';

export const EVENT_PREFIX = 'event:';
export const TASK_PREFIX = 'task:';

/** Fecha y hora (locales) de un día ISO y una hora HH:MM. */
function at(iso: string, hhmm: string) {
  const day = parseISODate(iso);
  day.setMinutes(timeToMinutes(hhmm));
  return day;
}

/** Hora HH:MM local de una fecha. */
export const timeOf = (date: Date) => minutesToTime(date.getHours() * 60 + date.getMinutes());

/** Las carpetas son los «recursos» del calendario: la vista por recurso hace de «por carpeta». */
export const calendarResources = (state: AppState): EventCalendarResource[] => state.projects.map((p) => ({ id: p.id, title: p.name, color: p.color }));

/**
 * Eventos del calendario: los de la app con su hora y las tareas abiertas con fecha como eventos de día completo
 * (solo lectura: se editan con su formulario). Los ids llevan prefijo para saber de cuál se trata.
 */
export function buildCalendarEvents(state: AppState): RCalendarEvent[] {
  const color = (projectId: string) => state.projects.find((p) => p.id === projectId)?.color;
  const events = state.events.map<RCalendarEvent>((e) => ({
    id: `${EVENT_PREFIX}${e.id}`,
    title: e.title,
    start: at(e.date, e.start),
    end: at(e.date, e.end),
    resourceId: e.projectId,
    color: color(e.projectId),
  }));
  const tasks = state.tasks
    .filter((t) => t.status !== 'done' && t.due)
    .map<RCalendarEvent>((t) => ({
      id: `${TASK_PREFIX}${t.id}`,
      title: t.title,
      start: parseISODate(t.due),
      end: addDays(parseISODate(t.due), 1), // el fin es exclusivo
      allDay: true,
      readOnly: true,
      resourceId: t.projectId,
      color: color(t.projectId),
    }));
  return [...events, ...tasks];
}

/** Qué es y cuál es el id de un evento del calendario. */
export function parseCalendarId(id: string): { kind: 'event' | 'task'; id: string } | null {
  if (id.startsWith(EVENT_PREFIX)) return { kind: 'event', id: id.slice(EVENT_PREFIX.length) };
  if (id.startsWith(TASK_PREFIX)) return { kind: 'task', id: id.slice(TASK_PREFIX.length) };
  return null;
}

export interface EventMove {
  id: string;
  date: string;
  start: string;
  end: string;
  projectId?: string;
}

/**
 * Un movimiento o redimensión de un evento de la app como cambio de fecha y horas. Devuelve null si no se puede
 * representar (tarea, día completo, o que acabe otro día).
 */
export function moveFromUpdate(update: { event: { id: string }; start: Date; end: Date; allDay: boolean; resourceId?: string }): EventMove | null {
  const parsed = parseCalendarId(update.event.id);
  if (parsed?.kind !== 'event' || update.allDay) return null;
  const date = toISODate(update.start);
  const lastMoment = new Date(update.end.getTime() - 1); // el fin es exclusivo: a las 00:00 sigue siendo el día anterior
  if (toISODate(lastMoment) !== date) return null;
  return { id: parsed.id, date, start: timeOf(update.start), end: update.end.getHours() === 0 && update.end.getMinutes() === 0 ? '23:59' : timeOf(update.end), projectId: update.resourceId };
}

/** Valores por defecto del formulario de evento al marcar un hueco del calendario. */
export function defaultsFromSlot(slot: { start: Date; end: Date; allDay: boolean; resourceId?: string }) {
  if (slot.allDay) return { date: toISODate(slot.start), projectId: slot.resourceId };
  const sameDay = toISODate(slot.start) === toISODate(new Date(slot.end.getTime() - 1));
  return { date: toISODate(slot.start), start: timeOf(slot.start), end: sameDay ? timeOf(slot.end) : '23:59', projectId: slot.resourceId };
}
