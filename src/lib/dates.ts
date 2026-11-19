// Fechas en formato ISO local (YYYY-MM-DD) y horas en formato HH:MM.
// Se trabaja siempre en hora local: la app es personal y no sincroniza con servidor.
import type { DateRange } from '../types';

const MS_PER_DAY = 86_400_000;

export const pad = (n: number) => String(n).padStart(2, '0');

export const toISODate = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export function parseISODate(iso: string) {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/** Lunes a las 00:00 de la semana de `date`. */
export function startOfWeek(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() - ((result.getDay() + 6) % 7));
  return result;
}

export const todayISO = (now = new Date()) => toISODate(now);

export const offsetISO = (days: number, now = new Date()) => toISODate(addDays(now, days));

export function timeToMinutes(hhmm: string) {
  const [hours, minutes] = hhmm.split(':').map(Number);
  return hours * 60 + minutes;
}

export const minutesToTime = (minutes: number) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

export const minutesOfDay = (date = new Date()) => date.getHours() * 60 + date.getMinutes();

/** Días naturales entre dos fechas ISO (redondeado para no fallar en cambios de horario). */
export const daysBetween = (fromISO: string, toISO: string) =>
  Math.round((parseISODate(toISO).getTime() - parseISODate(fromISO).getTime()) / MS_PER_DAY);

export const isInRange = (iso: string, [from, to]: DateRange) => iso >= from && iso <= to;

/** Las 7 fechas ISO (lunes a domingo) de la semana actual desplazada `weekOffset` semanas. */
export function weekDays(now = new Date(), weekOffset = 0) {
  const monday = addDays(startOfWeek(now), weekOffset * 7);
  return Array.from({ length: 7 }, (_, i) => toISODate(addDays(monday, i)));
}

export function weekRange(now = new Date(), weekOffset = 0): DateRange {
  const days = weekDays(now, weekOffset);
  return [days[0], days[6]];
}

/** Primer día del mes de `now` desplazado `monthOffset` meses. */
export const startOfMonth = (now = new Date(), monthOffset = 0) => new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);

/** Las 42 fechas ISO (6 semanas, de lunes a domingo) que cubren el mes en una rejilla. */
export function monthGridDays(now = new Date(), monthOffset = 0) {
  const first = startOfWeek(startOfMonth(now, monthOffset));
  return Array.from({ length: 42 }, (_, i) => toISODate(addDays(first, i)));
}

export const lastDaysRange =(days: number, now = new Date()): DateRange => [offsetISO(1 - days, now), todayISO(now)];
