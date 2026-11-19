import { describe, expect, it } from 'vitest';
import { daysBetween, isInRange, lastDaysRange, minutesToTime, monthGridDays, startOfWeek, timeToMinutes, toISODate, weekDays, weekRange } from '../src/lib/dates';

describe('dates', () => {
  it('startOfWeek devuelve el lunes, también si el día es domingo o lunes', () => {
    expect(toISODate(startOfWeek(new Date(2026, 10, 22)))).toBe('2026-11-16'); // domingo
    expect(toISODate(startOfWeek(new Date(2026, 10, 16)))).toBe('2026-11-16'); // lunes
    expect(toISODate(startOfWeek(new Date(2026, 10, 17, 23, 59)))).toBe('2026-11-16');
  });

  it('convierte entre HH:MM y minutos', () => {
    expect(timeToMinutes('09:30')).toBe(570);
    expect(minutesToTime(570)).toBe('09:30');
    expect(minutesToTime(0)).toBe('00:00');
  });

  it('weekDays y weekRange respetan el desplazamiento de semanas', () => {
    const now = new Date(2026, 10, 17);
    expect(weekDays(now)).toHaveLength(7);
    expect(weekRange(now)).toEqual(['2026-11-16', '2026-11-22']);
    expect(weekRange(now, 1)).toEqual(['2026-11-23', '2026-11-29']);
    expect(weekRange(now, -1)).toEqual(['2026-11-09', '2026-11-15']);
  });

  it('daysBetween no falla con el cambio de hora de octubre', () => {
    expect(daysBetween('2026-10-24', '2026-10-26')).toBe(2);
    expect(daysBetween('2026-11-17', '2026-11-16')).toBe(-1);
  });

  it('monthGridDays cubre el mes en 6 semanas empezando en lunes', () => {
    const days = monthGridDays(new Date(2026, 10, 17)); // noviembre 2026: el 1 es domingo
    expect(days).toHaveLength(42);
    expect(days[0]).toBe('2026-10-26');
    expect(days[6]).toBe('2026-11-01');
    expect(days).toContain('2026-11-30');
    expect(monthGridDays(new Date(2026, 10, 17), 1)[0]).toBe('2026-11-30'); // diciembre: el 1 es martes
  });

  it('lastDaysRange incluye hoy', () => {
    expect(lastDaysRange(30, new Date(2026, 10, 17))).toEqual(['2026-10-19', '2026-11-17']);
    expect(isInRange('2026-11-17', ['2026-11-16', '2026-11-22'])).toBe(true);
    expect(isInRange('2026-11-23', ['2026-11-16', '2026-11-22'])).toBe(false);
  });
});
