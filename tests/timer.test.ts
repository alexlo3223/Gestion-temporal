import { describe, expect, it } from 'vitest';
import { completePomodoro, elapsedMs, pauseTimer, remainingMs, startTimer, stopTimer } from '../src/store/timer';
import { NOW, createState, ctx } from './fixtures';

const MIN = 60_000;

describe('timer', () => {
  it('iniciar pone la tarea en progreso y cuenta el tiempo', () => {
    const state = createState();
    startTimer(state, 't1', ctx());
    expect(state.tasks[0].status).toBe('doing');
    expect(elapsedMs(state.timer, NOW + 5 * MIN)).toBe(5 * MIN);
    expect(remainingMs(state.timer, 25, NOW + 5 * MIN)).toBe(20 * MIN);
  });

  it('pausar congela el tiempo y reanudar lo continúa', () => {
    const state = createState();
    startTimer(state, 't1', ctx());
    pauseTimer(state, NOW + 10 * MIN);
    expect(elapsedMs(state.timer, NOW + 60 * MIN)).toBe(10 * MIN);
    startTimer(state, 't1', ctx({ now: NOW + 60 * MIN }));
    expect(elapsedMs(state.timer, NOW + 65 * MIN)).toBe(15 * MIN);
  });

  it('detener registra los minutos en la tarea y en el historial', () => {
    const state = createState();
    startTimer(state, 't1', ctx());
    expect(stopTimer(state, ctx({ now: NOW + 12 * MIN }))).toBe(12);
    expect(state.tasks[0].spentMin).toBe(12);
    expect(state.logs).toEqual([expect.objectContaining({ taskId: 't1', projectId: 'p1', minutes: 12 })]);
    expect(state.timer.taskId).toBeNull();
  });

  it('una sesión de menos de un minuto no se registra', () => {
    const state = createState();
    startTimer(state, 't1', ctx());
    expect(stopTimer(state, ctx({ now: NOW + 20_000 }))).toBe(0);
    expect(state.logs).toHaveLength(0);
  });

  it('cambiar de tarea cierra y registra la sesión anterior', () => {
    const state = createState();
    startTimer(state, 't1', ctx());
    startTimer(state, 't2', ctx({ now: NOW + 7 * MIN }));
    expect(state.tasks[0].spentMin).toBe(7);
    expect(state.timer.taskId).toBe('t2');
  });

  it('completar un pomodoro registra como máximo su duración', () => {
    const state = createState();
    startTimer(state, 't1', ctx());
    expect(completePomodoro(state, 25, ctx({ now: NOW + 3 * 60 * MIN }))).toBe(25);
    expect(state.tasks[0].spentMin).toBe(25);
  });
});
