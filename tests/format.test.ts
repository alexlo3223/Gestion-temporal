import { describe, expect, it } from 'vitest';
import { toCsv } from '../src/lib/download';
import { formatCountdown, formatDueLabel, formatDuration, percentOf } from '../src/lib/format';

describe('format', () => {
  it('formatDuration', () => {
    expect(formatDuration(5)).toBe('5m');
    expect(formatDuration(125)).toBe('2h 05m');
    expect(formatDuration(-3)).toBe('0m');
  });

  it('formatCountdown redondea hacia arriba los segundos', () => {
    expect(formatCountdown(25 * 60_000)).toBe('25:00');
    expect(formatCountdown(1)).toBe('00:01');
    expect(formatCountdown(0)).toBe('00:00');
  });

  it('formatDueLabel usa etiquetas relativas', () => {
    const today = '2026-11-17';
    expect(formatDueLabel('', today)).toBe('Sin fecha');
    expect(formatDueLabel(today, today)).toBe('Hoy');
    expect(formatDueLabel('2026-11-18', today)).toBe('Mañana');
    expect(formatDueLabel('2026-11-16', today)).toBe('Ayer');
    expect(formatDueLabel('2026-11-20', today)).toBe('viernes');
  });

  it('percentOf no divide por cero', () => {
    expect(percentOf(5, 0)).toBe(0);
    expect(percentOf(1, 4)).toBe(25);
  });
});

describe('toCsv', () => {
  it('escapa comillas y neutraliza fórmulas', () => {
    expect(toCsv([['a"b', '=SUM(A1)', 12]])).toBe('"a""b";"\'=SUM(A1)";"12"');
  });
});
