// Temporizador de foco (pomodoro). Se guarda como marcas de tiempo, no como contador,
// para que siga siendo exacto aunque la pestaña esté en segundo plano o se recargue.
import type { AppState, MutationContext, Timer } from '../types';
import { setTaskStatus } from './task';

const MS_PER_MINUTE = 60_000;

export const createIdleTimer = (): Timer => ({ taskId: null, startedAt: null, accumulatedMs: 0 });

export const isRunning = (timer: Timer) => timer.startedAt !== null;

export const elapsedMs = (timer: Timer, now: number) =>
  timer.accumulatedMs + (timer.startedAt !== null ? now - timer.startedAt : 0);

export const remainingMs = (timer: Timer, pomodoroMinutes: number, now: number) =>
  Math.max(0, pomodoroMinutes * MS_PER_MINUTE - elapsedMs(timer, now));

/** Detiene la sesión actual y registra los minutos en la tarea. Devuelve los minutos registrados. */
export function stopTimer(state: AppState, { now, today, createId }: MutationContext) {
  const { timer } = state;
  const task = state.tasks.find((t) => t.id === timer.taskId);
  const minutes = Math.round(elapsedMs(timer, now) / MS_PER_MINUTE);
  state.timer = createIdleTimer();
  if (!task || minutes <= 0) return 0;
  task.spentMin += minutes;
  state.logs.push({ id: createId(), date: today, projectId: task.projectId, taskId: task.id, minutes });
  return minutes;
}

export function stopTimerFor(state: AppState, taskId: string, ctx: MutationContext) {
  return state.timer.taskId === taskId ? stopTimer(state, ctx) : 0;
}

/** Inicia o reanuda la sesión de una tarea; si había otra en marcha, la cierra y la registra. */
export function startTimer(state: AppState, taskId: string, ctx: MutationContext) {
  const task = state.tasks.find((t) => t.id === taskId);
  if (!task) return;
  if (state.timer.taskId && state.timer.taskId !== taskId) stopTimer(state, ctx);
  if (state.timer.taskId !== taskId) state.timer = { taskId, startedAt: ctx.now, accumulatedMs: 0 };
  else if (!isRunning(state.timer)) state.timer.startedAt = ctx.now;
  if (task.status !== 'doing') setTaskStatus(task, 'doing', ctx.today);
}

export function pauseTimer(state: AppState, now: number) {
  if (!isRunning(state.timer)) return;
  state.timer.accumulatedMs = elapsedMs(state.timer, now);
  state.timer.startedAt = null;
}

/**
 * Cierra un pomodoro que ha llegado a su fin. Registra como máximo la duración del pomodoro,
 * aunque la app estuviera cerrada y haya pasado más tiempo.
 */
export function completePomodoro(state: AppState, pomodoroMinutes: number, ctx: MutationContext) {
  state.timer = { ...state.timer, startedAt: null, accumulatedMs: pomodoroMinutes * MS_PER_MINUTE };
  return stopTimer(state, ctx);
}
