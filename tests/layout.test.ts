import { describe, expect, it } from 'vitest';
import { HOME_COLUMNS, HOME_WIDGETS, WIDGET_SIZE } from '../src/constants';
import { addWidget, moveWidget, removeWidget, resizeWidget, resolveHomeLayout, sizeOf } from '../src/store/layout';
import { setHomeLayout, updateSettings } from '../src/store/mutations';
import type { HomeWidget } from '../src/types';
import { createState } from './fixtures';

const ids = (l: HomeWidget[]) => l.map((w) => w.id);
const FIXED = Object.keys(HOME_WIDGETS).filter((t) => !HOME_WIDGETS[t as keyof typeof HOME_WIDGETS].ref);

describe('distribución de Inicio', () => {
  it('sin guardar: los bloques fijos y un panel por cada carpeta, cada uno con su tamaño de serie', () => {
    const l = resolveHomeLayout(undefined, ['p1', 'p2']);
    expect(ids(l)).toEqual([...FIXED, 'project:p1', 'project:p2']);
    expect(sizeOf(l.find((w) => w.id === 'timeline')!)).toEqual({ w: 2, h: 2 });
    expect(sizeOf(l.find((w) => w.id === 'project:p1')!)).toEqual({ w: 1, h: 1 });
  });

  it('todos los tamaños quedan entre 1 y 3 celdas, también los guardados fuera de rango', () => {
    const l = resolveHomeLayout([{ id: 'meetings', type: 'meetings', w: 9, h: -4 }, { id: 'timeline', type: 'timeline', w: 0, h: 2 }]);
    for (const w of l) {
      const { w: cw, h: ch } = sizeOf(w);
      expect(cw).toBeGreaterThanOrEqual(WIDGET_SIZE.min);
      expect(cw).toBeLessThanOrEqual(WIDGET_SIZE.max);
      expect(ch).toBeGreaterThanOrEqual(WIDGET_SIZE.min);
      expect(ch).toBeLessThanOrEqual(WIDGET_SIZE.max);
    }
    expect(sizeOf(l.find((w) => w.id === 'meetings')!)).toEqual({ w: 3, h: 1 });
  });

  it('sanea lo guardado: desconocidos, repetidos y referencias incoherentes', () => {
    const saved = [
      { id: 'nope', type: 'nope' },
      { id: 'meetings', type: 'meetings' },
      { id: 'meetings', type: 'meetings' },
      { id: 'project', type: 'project' }, // sin ref
      { id: 'meetings:x', type: 'meetings', ref: 'x' }, // un fijo no lleva ref
      { id: 'a', type: 'task', ref: 't1' },
      { id: 'a', type: 'task', ref: 't1' },
    ];
    expect(ids(resolveHomeLayout(saved))).toEqual(['meetings', 'task:t1']);
  });

  it('el bloque «Proyectos» de versiones anteriores se sustituye por un panel por carpeta, en su sitio', () => {
    const old = [
      { id: 'meetings', type: 'meetings', w: 1, h: 1 },
      { id: 'projects', type: 'projects' },
      { id: 'focusToday', type: 'focusToday', w: 1, h: 1 },
    ];
    expect(ids(resolveHomeLayout(old, ['p1', 'p2']))).toEqual(['meetings', 'project:p1', 'project:p2', 'focusToday']);
  });

  it('acepta el formato antiguo (id = tipo, con fila y columna) y lo ordena por posición', () => {
    const old = [
      { id: 'projects', span: 12, col: 1, row: 4 },
      { id: 'meetings', span: 3, col: 4, row: 1 },
      { id: 'focusToday', span: 3, col: 1, row: 1 },
    ];
    expect(ids(resolveHomeLayout(old, ['p1']))).toEqual(['focusToday', 'meetings', 'project:p1']);
  });

  it('mover un bloque corre los demás, sin repetidos', () => {
    const l = resolveHomeLayout(undefined, ['p1']);
    const moved = moveWidget(l, 'project:p1', 0);
    expect(ids(moved)[0]).toBe('project:p1');
    expect(moved).toHaveLength(l.length);
    expect(moveWidget(l, 'meetings', 99).at(-1)?.id).toBe('meetings');
  });

  it('cambiar el tamaño respeta los límites de 1 a 3', () => {
    const l = resolveHomeLayout(undefined);
    expect(sizeOf(resizeWidget(l, 'meetings', { w: 3, h: 3 }).find((w) => w.id === 'meetings')!)).toEqual({ w: 3, h: 3 });
    expect(sizeOf(resizeWidget(l, 'meetings', { w: 0, h: 9 }).find((w) => w.id === 'meetings')!)).toEqual({ w: 1, h: 3 });
  });

  it('en pantallas estrechas hay menos columnas, y un bloque nunca ocupa más que las que hay', () => {
    expect(HOME_COLUMNS(1200)).toBe(6);
    expect(HOME_COLUMNS(700)).toBe(3);
    expect(HOME_COLUMNS(360)).toBe(1);
  });

  it('añade bloques de proyecto y tarea con su referencia y tamaño de serie, una sola vez, y los quita', () => {
    let l = addWidget(resolveHomeLayout(undefined), 'project', 'p1');
    l = addWidget(l, 'task', 't1');
    l = addWidget(l, 'task', 't1');
    expect(l.filter((w) => w.ref).map((w) => w.id)).toEqual(['project:p1', 'task:t1']);
    expect(sizeOf(l.find((w) => w.id === 'task:t1')!)).toEqual({ w: 1, h: 2 });
    expect(ids(removeWidget(l, 'task:t1'))).not.toContain('task:t1');
  });

  it('guardar ajustes no borra la distribución; restablecer sí', () => {
    const state = createState();
    setHomeLayout(state, [{ id: 'meetings', type: 'meetings', w: 2, h: 1 }, { id: 'project:p1', type: 'project', ref: 'p1' }]);
    updateSettings(state, { name: 'A', secondTimezone: state.settings.secondTimezone, weeklyGoalHours: '10', workStart: '9', workEnd: '17', pomodoroMinutes: '25' });
    expect(ids(state.settings.homeLayout!)).toEqual(['meetings', 'project:p1']);
    expect(sizeOf(state.settings.homeLayout![0])).toEqual({ w: 2, h: 1 });
    setHomeLayout(state, undefined);
    expect(state.settings.homeLayout).toBeUndefined();
  });
});
