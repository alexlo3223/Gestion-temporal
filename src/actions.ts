// Lo que hace cada acción del usuario: ejecuta la mutación, guarda y avisa.
// No toca el DOM; los componentes llaman a estas funciones.
import { EVENT_KINDS, PRIORITIES } from './constants';
import { todayISO } from './lib/dates';
import { UTF8_BOM, downloadFile, toCsv } from './lib/download';
import { formatDuration } from './lib/format';
import { createId } from './lib/id';
import * as mutations from './store/mutations';
import { findTask, logsInRange, periodRange, projectOf } from './store/selectors';
import { store } from './store/store';
import { completePomodoro, isRunning, pauseTimer, remainingMs, startTimer, stopTimer } from './store/timer';
import { notify } from './store/toasts';
import type { AppState, DrawerState, FormInput, HomeWidget, Period, QuickFilter, TaskStatus, UiState } from './types';

const STATUS_LABELS: Record<TaskStatus, string> = { todo: 'Por hacer', doing: 'En progreso', done: 'Completada' };

const context = () =>({ now: Date.now(), today: todayISO(), createId });

/**
 * Ejecuta una mutación. Los errores de validación se muestran como aviso y devuelven
 * `undefined`; cualquier otro error se propaga (es un bug y no debe ocultarse).
 */
function run<T>(mutate: (state: AppState) => T, { closeDrawer = false } = {}): T | undefined {
  try {
    const result = store.update(mutate);
    store.setUi(closeDrawer ? { drawer: null, fieldError: null } : { fieldError: null });
    return result;
  } catch (error) {
    if (error instanceof mutations.ValidationError) {
      notify({ kind: 'error', title: error.message });
      store.setUi({ fieldError: error.field ? { field: error.field, message: error.message } : null });
      return undefined;
    }
    throw error;
  }
}

const success = (title: string, body?: string) => notify({ kind: 'success', title, body });
const undo = (title: string, restore: (state: AppState) => void) =>
  notify({ kind: 'info', title, action: { label: 'Deshacer', run: () => store.update(restore) } });

export const actions = {
  // ---------- paneles y filtros ----------
  openDrawer: (drawer: DrawerState) => store.setUi({ drawer, menuOpen: false, fieldError: null }),
  closeDrawer: () => store.setUi({ drawer: null, fieldError: null }),
  setMenu: (menuOpen: boolean) => store.setUi({ menuOpen }),
  search: (query: string) => store.setUi({ query }),
  filterProjects: (projects: string[]) => store.setUi({ projects }),
  filterPriority: (priority: UiState['priority']) => store.setUi({ priority }),
  toggleQuick(filter: QuickFilter) {
    const { quick } = store.getSnapshot().ui;
    store.setUi({ quick: quick.includes(filter) ? quick.filter((q) => q !== filter) : [...quick, filter] });
  },
  /** Mueve el calendario `offset` unidades de la vista actual; 0 vuelve a hoy. */
  setPeriod: (period: Period) => store.setUi({ period }),

  // ---------- tareas ----------
  saveTask(input: FormInput) {
    const result = run((s) => mutations.saveTask(s, input, context()), { closeDrawer: true });
    if (result) success(result.created ? 'Tarea creada' : 'Tarea actualizada', result.task.title);
  },
  deleteTask(id: string) {
    const removed = run((s) => mutations.deleteTask(s, id), { closeDrawer: true });
    if (removed) undo(`Tarea «${removed.task.title}» eliminada`, (s) => mutations.restoreTask(s, removed.task, removed.index));
  },
  toggleTask(id: string) {
    const status = run((s) => mutations.toggleTask(s, id, context()));
    if (status === 'done') success('¡Tarea completada!', findTask(store.getSnapshot().state, id)?.title);
  },
  moveTask(id: string, status: TaskStatus) {
    const changed = run((s) => mutations.moveTask(s, id, status, context()));
    if (changed && status === 'done') success('¡Tarea completada!', findTask(store.getSnapshot().state, id)?.title);
  },

  // ---------- temporizador de foco ----------
  startTimer: (taskId: string) => run((s) => startTimer(s, taskId, context())),
  resumeTimer: () => run((s) => s.timer.taskId && startTimer(s, s.timer.taskId, context())),
  pauseTimer: () => run((s) => pauseTimer(s, Date.now())),
  stopTimer() {
    const minutes = run((s) => stopTimer(s, context()));
    if (minutes) success(`Registrados ${formatDuration(minutes)} de foco`);
    else notify({ kind: 'info', title: 'Sesión descartada', body: 'Duró menos de un minuto.' });
  },
  /** Lo llama el reloj de la app cada segundo: cierra el pomodoro cuando llega a cero. */
  completePomodoroIfDue(now: number) {
    const { timer, settings, tasks } = store.getSnapshot().state;
    if (!isRunning(timer) || remainingMs(timer, settings.pomodoroMinutes, now) > 0) return;
    const title = tasks.find((t) => t.id === timer.taskId)?.title ?? '';
    run((s) => completePomodoro(s, settings.pomodoroMinutes, { now, today: todayISO(new Date(now)), createId }));
    success('Pomodoro completado', title);
    if (settings.notify && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('Pomodoro completado', { body: title });
    }
  },

  setTaskDates(id: string, dates: { start: string; due: string }) {
    run((s) => mutations.setTaskDates(s, id, dates));
  },
  // ---------- calendario ----------
  rescheduleEvent(id: string, to: { date: string; start: string; end: string; projectId?: string }) {
    run((s) => mutations.rescheduleEvent(s, id, to));
  },
  saveEvent(input: FormInput) {
    const result = run((s) => mutations.saveEvent(s, input, context()), { closeDrawer: true });
    if (result) success(result.created ? 'Evento creado' : 'Evento actualizado', result.event.title);
  },
  deleteEvent(id: string) {
    const removed = run((s) => mutations.deleteEvent(s, id), { closeDrawer: true });
    if (removed) undo(`Evento «${removed.event.title}» eliminado`, (s) => mutations.restoreEvent(s, removed.event, removed.index));
  },

  // ---------- carpetas ----------
  saveProject(input: FormInput) {
    const result = run((s) => mutations.saveProject(s, input, context()), { closeDrawer: true });
    if (result) success(result.created ? 'Carpeta creada' : 'Carpeta actualizada', result.project.name);
  },
  deleteProject(id: string) {
    const removed = run((s) => mutations.deleteProject(s, id), { closeDrawer: true });
    if (!removed) return;
    const { ui } = store.getSnapshot();
    if (ui.projects.includes(id)) store.setUi({ projects: ui.projects.filter((p) => p !== id) });
    undo(`Carpeta «${removed.project.name}» eliminada`, (s) => mutations.restoreProject(s, removed));
  },

  // ---------- participantes, chat y documentos ----------
  addMember(projectId: string, input: FormInput) {
    const member = run((s) => mutations.addMember(s, projectId, input, context()));
    if (member) success('Participante añadido', member.name);
    return !!member;
  },
  removeMember(projectId: string, memberId: string) {
    const removed = run((s) => mutations.removeMember(s, projectId, memberId));
    if (removed) undo(`«${removed.member.name}» ya no participa`, (s) => mutations.restoreMember(s, projectId, removed.member, removed.index));
  },
  postMessage(projectId: string, input: FormInput) {
    return !!run((s) => mutations.postMessage(s, projectId, input, context()));
  },
  deleteMessage(id: string) {
    const removed = run((s) => mutations.deleteMessage(s, id));
    if (removed) undo('Mensaje eliminado', (s) => mutations.restoreMessage(s, removed.message, removed.index));
  },
  saveDoc(projectId: string, input: FormInput) {
    const result = run((s) => mutations.saveDoc(s, projectId, input, context()));
    if (result) success(result.created ? 'Documento creado' : 'Documento guardado', result.doc.title);
    return result?.doc;
  },
  deleteDoc(id: string) {
    const removed = run((s) => mutations.deleteDoc(s, id));
    if (removed) undo(`«${removed.doc.title}» eliminado`, (s) => mutations.restoreDoc(s, removed.doc, removed.index));
  },

  // ---------- ajustes y datos ----------
  saveSettings(input: FormInput) {
    const settings = run((s) => mutations.updateSettings(s, input));
    if (!settings) return;
    success('Ajustes guardados');
    if (settings.notify && 'Notification' in window && Notification.permission === 'default') Notification.requestPermission();
  },
  setHomeLayout(layout: HomeWidget[]) {
    run((s) => mutations.setHomeLayout(s, layout));
  },
  resetHomeLayout() {
    run((s) => mutations.setHomeLayout(s, undefined));
    success('Inicio vuelve a su distribución de serie');
  },
  /** Campana de la cabecera: activa o silencia el aviso al terminar un pomodoro. */
  toggleNotify() {
    const on = run((s) => (s.settings.notify = !s.settings.notify));
    if (on && 'Notification' in window && Notification.permission === 'default') Notification.requestPermission();
  },
  resetData() {
    store.reset();
    success('Datos de muestra restablecidos');
  },
  exportCsv(period: Period) {
    const { state } = store.getSnapshot();
    const range = periodRange(period);
    const rows = logsInRange(state, range)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((log) => [log.date, projectOf(state, log.projectId).name, findTask(state, log.taskId)?.title ?? '', log.minutes]);
    downloadFile(`horas_${range[0]}_${range[1]}.csv`, UTF8_BOM + toCsv([['Fecha', 'Carpeta', 'Tarea', 'Minutos'], ...rows]), 'text/csv;charset=utf-8');
  },
  exportTasksCsv() {
    const { state } = store.getSnapshot();
    const rows = state.tasks.map((t) => [t.title, projectOf(state, t.projectId).name, PRIORITIES[t.priority].label, STATUS_LABELS[t.status], t.due, t.estimateMin, t.spentMin, t.doneAt]);
    const header = ['Tarea', 'Carpeta', 'Prioridad', 'Estado', 'Fecha límite', 'Estimación (min)', 'Registrado (min)', 'Completada'];
    downloadFile(`tareas_${todayISO()}.csv`, UTF8_BOM + toCsv([header, ...rows]), 'text/csv;charset=utf-8');
  },
  exportEventsCsv() {
    const { state } = store.getSnapshot();
    const rows = [...state.events]
      .sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start))
      .map((e) => [e.date, e.start, e.end, e.title, EVENT_KINDS[e.kind].label, projectOf(state, e.projectId).name]);
    downloadFile(`eventos_${todayISO()}.csv`, UTF8_BOM + toCsv([['Fecha', 'Inicio', 'Fin', 'Evento', 'Tipo', 'Carpeta'], ...rows]), 'text/csv;charset=utf-8');
  },
  exportBackup() {
    downloadFile(`gestor-tiempo_${todayISO()}.json`, JSON.stringify(store.getSnapshot().state, null, 2), 'application/json');
  },
};
