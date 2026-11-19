// Cambios de estado. Validan la entrada (viene de formularios) y lanzan ValidationError
// con un mensaje apto para mostrar al usuario. Se aplican sobre un borrador (ver store.update).
import { EVENT_KINDS, PRIORITIES, PROJECT_COLORS, TASK_STATUSES, TIMEZONES } from '../constants';
import { timeToMinutes } from '../lib/dates';
import { resolveHomeLayout } from './layout';
import type { AppState, CalendarEvent, EventKind, FormInput, HomeWidget, MutationContext, Priority, Project, Settings, Task, TaskStatus } from '../types';
import { setTaskStatus } from './task';
import { createIdleTimer, stopTimerFor } from './timer';

export class ValidationError extends Error {
  /** `name` del campo del formulario al que se refiere, para pintar el error junto a él. */
  readonly field?: string;
  constructor(message: string, field?: string) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const str = (value: unknown) => (typeof value === 'string' ? value : '');

function text(value: unknown, { label, max, required = false, field }: { label: string; max: number; required?: boolean; field?: string }) {
  const result = str(value).trim();
  if (required && !result) throw new ValidationError(`${label} es obligatorio`, field);
  if (result.length > max) throw new ValidationError(`${label} admite como máximo ${max} caracteres`, field);
  return result;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], label: string): T {
  if (!allowed.includes(value as T)) throw new ValidationError(`${label} no es válido`);
  return value as T;
}

function integer(value: unknown, { label, min, max, field }: { label: string; min: number; max: number; field?: string }) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) {
    throw new ValidationError(`${label} debe ser un número entre ${min} y ${max}`, field);
  }
  return number;
}

function date(value: unknown, { label, required = false, field }: { label: string; required?: boolean; field?: string }) {
  const v = str(value);
  if (!v && !required) return '';
  if (!ISO_DATE.test(v)) throw new ValidationError(`${label} no es válida`, field);
  return v;
}

function time(value: unknown, label: string, field?: string) {
  const v = str(value);
  if (!TIME.test(v)) throw new ValidationError(`${label} no es válida`, field);
  return v;
}

function projectRef(state: AppState, id: unknown) {
  if (!state.projects.some((p) => p.id === id)) throw new ValidationError('Selecciona una carpeta válida');
  return id as string;
}

function requireTask(state: AppState, id: string) {
  const task = state.tasks.find((t) => t.id === id);
  if (!task) throw new ValidationError('La tarea ya no existe');
  return task;
}

/** Vuelve a insertar un elemento borrado en su posición original (para "Deshacer"). */
function restoreAt<T extends { id: string }>(list: T[], item: T, index: number) {
  if (list.some((x) => x.id === item.id)) return;
  list.splice(Math.min(index, list.length), 0, item);
}

// ---------- tareas ----------

export function saveTask(state: AppState, input: FormInput, ctx: MutationContext) {
  const data = {
    title: text(input.title, { label: 'El título', max: 120, required: true, field: 'title' }),
    description: text(input.description, { label: 'La descripción', max: 500, field: 'description' }),
    projectId: projectRef(state, input.projectId),
    priority: oneOf<Priority>(input.priority, Object.keys(PRIORITIES) as Priority[], 'La prioridad'),
    estimateMin: integer(input.estimateMin || 0, { label: 'La estimación', min: 0, max: 1440, field: 'estimateMin' }),
    due: date(input.due, { label: 'La fecha límite', field: 'due' }),
  };
  const existing = state.tasks.find((t) => t.id === input.id);
  if (existing) {
    Object.assign(existing, data);
    return { task: existing, created: false };
  }
  const task: Task = { id: ctx.createId(), status: 'todo', spentMin: 0, doneAt: '', ...data };
  state.tasks.push(task);
  return { task, created: true };
}

/** Borra la tarea y devuelve lo necesario para deshacerlo. */
export function deleteTask(state: AppState, id: string) {
  const index = state.tasks.findIndex((t) => t.id === id);
  const task = requireTask(state, id);
  if (state.timer.taskId === id) state.timer = createIdleTimer();
  state.tasks.splice(index, 1);
  return { task, index };
}

export const restoreTask = (state: AppState, task: Task, index: number) => restoreAt(state.tasks, task, index);

/** Mueve la tarea de columna; si sale de "en progreso" se cierra su sesión de foco. */
export function moveTask(state: AppState, id: string, status: TaskStatus, ctx: MutationContext) {
  const task = requireTask(state, id);
  oneOf(status, TASK_STATUSES, 'El estado');
  if (task.status === status) return false;
  if (status !== 'doing') stopTimerFor(state, id, ctx);
  setTaskStatus(task, status, ctx.today);
  return true;
}

export function toggleTask(state: AppState, id: string, ctx: MutationContext) {
  const task = requireTask(state, id);
  moveTask(state, id, task.status === 'done' ? 'todo' : 'done', ctx);
  return task.status;
}

// ---------- eventos ----------

export function saveEvent(state: AppState, input: FormInput, ctx: MutationContext) {
  const data = {
    title: text(input.title, { label: 'El título', max: 120, required: true, field: 'title' }),
    projectId: projectRef(state, input.projectId),
    kind: oneOf<EventKind>(input.kind, Object.keys(EVENT_KINDS) as EventKind[], 'El tipo'),
    date: date(input.date, { label: 'La fecha', required: true, field: 'date' }),
    start: time(input.start, 'La hora de inicio', 'start'),
    end: time(input.end, 'La hora de fin', 'end'),
  };
  if (timeToMinutes(data.end) <= timeToMinutes(data.start)) {
    throw new ValidationError('La hora de fin debe ser posterior a la de inicio', 'end');
  }
  const existing = state.events.find((e) => e.id === input.id);
  if (existing) {
    Object.assign(existing, data);
    return { event: existing, created: false };
  }
  const event: CalendarEvent = { id: ctx.createId(), ...data };
  state.events.push(event);
  return { event, created: true };
}

export function deleteEvent(state: AppState, id: string) {
  const index = state.events.findIndex((e) => e.id === id);
  if (index === -1) throw new ValidationError('El evento ya no existe');
  const [event] = state.events.splice(index, 1);
  return { event, index };
}

export const restoreEvent = (state: AppState, event: CalendarEvent, index: number) => restoreAt(state.events, event, index);

// ---------- carpetas ----------

export function saveProject(state: AppState, input: FormInput, ctx: MutationContext) {
  const data = {
    name: text(input.name, { label: 'El nombre', max: 40, required: true, field: 'name' }),
    description: text(input.description, { label: 'La descripción', max: 80, field: 'description' }),
    color: oneOf(input.color, Object.keys(PROJECT_COLORS), 'El color'),
  };
  const existing = state.projects.find((p) => p.id === input.id);
  if (existing) {
    Object.assign(existing, data);
    return { project: existing, created: false };
  }
  const project: Project = { id: ctx.createId(), ...data };
  state.projects.push(project);
  return { project, created: true };
}

export function deleteProject(state: AppState, id: string) {
  const inUse = state.tasks.some((t) => t.projectId === id) || state.events.some((e) => e.projectId === id);
  if (inUse) throw new ValidationError('Mueve o elimina sus tareas y eventos antes de borrar la carpeta');
  const index = state.projects.findIndex((p) => p.id === id);
  if (index === -1) throw new ValidationError('La carpeta ya no existe');
  const [project] = state.projects.splice(index, 1);
  return { project, index };
}

export const restoreProject = (state: AppState, project: Project, index: number) => restoreAt(state.projects, project, index);

// ---------- ajustes ----------

/** Guarda la distribución de Inicio ya saneada (viene de la interfaz o de la nube). */
export function setHomeLayout(state: AppState, layout: readonly HomeWidget[] | undefined) {
  if (layout) state.settings.homeLayout = resolveHomeLayout(layout);
  else delete state.settings.homeLayout;
}

export function updateSettings(state: AppState, input: FormInput): Settings {
  const settings: Settings = {
    ...state.settings, // conserva lo que no está en el formulario (p. ej. la distribución de Inicio)
    name: text(input.name, { label: 'El nombre', max: 40, required: true, field: 'name' }),
    secondTimezone: oneOf(input.secondTimezone, Object.keys(TIMEZONES), 'La zona horaria'),
    weeklyGoalHours: integer(input.weeklyGoalHours, { label: 'El objetivo semanal', min: 1, max: 80, field: 'weeklyGoalHours' }),
    workStart: integer(input.workStart, { label: 'El inicio de jornada', min: 0, max: 23, field: 'workStart' }),
    workEnd: integer(input.workEnd, { label: 'El fin de jornada', min: 1, max: 24, field: 'workEnd' }),
    pomodoroMinutes: integer(input.pomodoroMinutes, { label: 'La duración del pomodoro', min: 1, max: 120, field: 'pomodoroMinutes' }),
    notify: input.notify === 'on',
  };
  if (settings.workEnd <= settings.workStart) {
    throw new ValidationError('El fin de jornada debe ser posterior al inicio', 'workEnd');
  }
  state.settings = settings;
  return settings;
}
