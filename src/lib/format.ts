import { daysBetween, pad, parseISODate, todayISO } from './dates';

const LOCALE = 'es-ES';

export function formatDuration(minutes: number) {
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  return hours ? `${hours}h ${pad(rest)}m` : `${rest}m`;
}

export function formatCountdown(ms: number) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`;
}

export const formatDate = (iso: string, options: Intl.DateTimeFormatOptions) =>
  parseISODate(iso).toLocaleDateString(LOCALE, options);

export const formatClock = (date: Date, timeZone?: string) =>
  date.toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit', ...(timeZone && { timeZone }) });

export function formatDueLabel(iso: string, today = todayISO()) {
  if (!iso) return 'Sin fecha';
  const diff = daysBetween(today, iso);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Mañana';
  if (diff === -1) return 'Ayer';
  if (diff > 1 && diff < 7) return formatDate(iso, { weekday: 'long' });
  return formatDate(iso, { day: 'numeric', month: 'short' });
}

export const percentOf = (part: number, total: number) => (total > 0 ? (part / total) * 100 : 0);

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
