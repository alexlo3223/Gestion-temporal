import { describe, expect, it } from 'vitest';
import { HOME_WIDGETS } from '../src/constants';
import { overlaps, placeWidget, resolveHomeLayout } from '../src/store/layout';
import { setHomeLayout, updateSettings } from '../src/store/mutations';
import type { HomeWidget } from '../src/types';
import { createState } from './fixtures';

const byId = (l: HomeWidget[], id: string) => l.find((w) => w.id === id)!;
const noOverlaps = (l: HomeWidget[]) => l.every((a) => l.every((b) => a === b || !overlaps(a, b)));

describe('distribución de Inicio', () => {
  it('sin guardar usa la de serie, sin solapes', () => {
    const l = resolveHomeLayout(undefined);
    expect(l).toHaveLength(Object.keys(HOME_WIDGETS).length);
    expect(byId(l, 'timeline')).toMatchObject({ col: 6, row: 2, span: 7 });
    expect(noOverlaps(l)).toBe(true);
  });

  it('sanea lo guardado: desconocidos, repetidos, medidas fuera de la cuadrícula y formato antiguo sin posición', () => {
    const saved = [{ id: 'nope', span: 3, col: 1, row: 1 }, { id: 'meetings', span: 99, col: 40, row: -2 }, { id: 'meetings', span: 3, col: 1, row: 1 }, { id: 'projects', span: 6 }] as HomeWidget[];
    const l = resolveHomeLayout(saved);
    expect(byId(l, 'meetings')).toMatchObject({ span: 12, col: 1 });
    expect(byId(l, 'projects')).toMatchObject({ span: 6, col: 1 });
    expect(l.some((w) => (w.id as string) === 'nope')).toBe(false);
    expect(noOverlaps(l)).toBe(true);
  });

  it('respeta los huecos: un bloque puede quedar suelto a la derecha', () => {
    const l = placeWidget(resolveHomeLayout(undefined), 'projects', { col: 9, row: 6, span: 4 });
    expect(byId(l, 'projects')).toEqual({ id: 'projects', col: 9, row: 6, span: 4 });
  });

  it('al soltar encima de otro, el movido manda y el pisado baja', () => {
    const l = placeWidget(resolveHomeLayout(undefined), 'focusWeek', { col: 1, row: 1 });
    expect(byId(l, 'focusWeek')).toMatchObject({ col: 1, row: 1 });
    expect(byId(l, 'meetings').row).toBeGreaterThan(1);
    expect(noOverlaps(l)).toBe(true);
  });

  it('no deja que un bloque se salga por la derecha', () => {
    const l = placeWidget(resolveHomeLayout(undefined), 'spotlight', { col: 11 });
    expect(byId(l, 'spotlight').col + byId(l, 'spotlight').span - 1).toBeLessThanOrEqual(12);
  });

  it('guardar ajustes no borra la distribución; restablecer sí', () => {
    const state = createState();
    setHomeLayout(state, [{ id: 'projects', span: 6, col: 4, row: 1 }]);
    updateSettings(state, { name: 'A', secondTimezone: state.settings.secondTimezone, weeklyGoalHours: '10', workStart: '9', workEnd: '17', pomodoroMinutes: '25' });
    expect(byId(state.settings.homeLayout!, 'projects')).toEqual({ id: 'projects', span: 6, col: 4, row: 1 });
    setHomeLayout(state, undefined);
    expect(state.settings.homeLayout).toBeUndefined();
  });
});
