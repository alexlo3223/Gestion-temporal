// Cambios de estado. Validan la entrada (viene de formularios) y lanzan ValidationError
// con un mensaje apto para mostrar al usuario. Se aplican sobre un borrador (ver store.update).
import { EVENT_KINDS, ME_ID, PRIORITIES, PROJECT_COLORS, TASK_STATUSES, TIMEZONES } from '../constants';
import { timeToMinutes } from '../lib/dates';
import { resolveHomeLayout } from './layout';
import type { AppState, CalendarEvent, ChatMessage, DocKind, EventKind, FormInput, HomeWidget, Member, MutationContext, Phase, Priority, Project, ProjectDoc, Settings, Task, TaskStatus } from '../types';
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

/** La fase debe ser una de la carpeta; '' = sin fase. */
function phaseRef(state: AppState, projectId: string, value: unknown) {
  const id = str(value);
  if (!id) return '';
  const project = state.projects.find((p) => p.id === projectId);
  if (!project?.phases.some((f) => f.id === id)) throw new ValidationError('La fase no pertenece a la carpeta', 'phaseId');
  return id;
}

function checkRange(start: string, due: string) {
  if (start && due && start > due) throw new ValidationError('El inicio no puede ser posterior a la fecha límite', 'start');
}

/** Predecesoras válidas: tareas que existen, sin repetir, sin la propia tarea y sin crear ciclos. */
function dependenciesOf(state: AppState, id: unknown, projectId: string, value: unknown): string[] {
  const list = (Array.isArray(value) ? value : value === undefined || value === '' ? [] : [value]).map(String);
  // solo tareas del mismo proyecto: las de otras carpetas no se pueden elegir
  const ids = [...new Set(list)].filter((d) => d !== id && state.tasks.some((t) => t.id === d && t.projectId === projectId));
  if (ids.some((d) => reaches(state, d, String(id)))) throw new ValidationError('Una tarea no puede depender de otra que depende de ella', 'dependsOn');
  return ids;
}

/** ¿Llega `from` a `target` siguiendo las predecesoras? */
function reaches(state: AppState, from: string, target: string) {
  const seen = new Set<string>();
  const stack = [from];
  while (stack.length) {
    const current = stack.pop()!;
    if (current === target) return true;
    if (seen.has(current)) continue;
    seen.add(current);
    stack.push(...(state.tasks.find((t) => t.id === current)?.dependsOn ?? []));
  }
  return false;
}

export function saveTask(state: AppState, input: FormInput, ctx: MutationContext) {
  const existing = state.tasks.find((t) => t.id === input.id);
  const projectId = projectRef(state, input.projectId);
  const data = {
    title: text(input.title, { label: 'El título', max: 120, required: true, field: 'title' }),
    description: text(input.description, { label: 'La descripción', max: 500, field: 'description' }),
    projectId,
    // sin el campo (formularios antiguos) se conserva; al cambiar de carpeta sin indicar fase, se limpia
    phaseId: 'phaseId' in input ? phaseRef(state, projectId, input.phaseId) : existing && existing.projectId === projectId ? existing.phaseId : '',
    priority: oneOf<Priority>(input.priority, Object.keys(PRIORITIES) as Priority[], 'La prioridad'),
    estimateMin: integer(input.estimateMin || 0, { label: 'La estimación', min: 0, max: 1440, field: 'estimateMin' }),
    start: 'start' in input ? date(input.start, { label: 'El inicio', field: 'start' }) : existing?.start ?? '',
    dependsOn: 'dependsOn' in input ? dependenciesOf(state, input.id, projectId, input.dependsOn) : existing?.dependsOn ?? [],
    due: date(input.due, { label: 'La fecha límite', field: 'due' }),
  };
  checkRange(data.start, data.due);
  if (existing) {
    Object.assign(existing, data);
    return { task: existing, created: false };
  }
  const task: Task = { id: ctx.createId(), status: 'todo', spentMin: 0, doneAt: '', ...data };
  state.tasks.push(task);
  return { task, created: true };
}

/** Cambia las fechas de una tarea (arrastrar su barra en el gantt). `start` vacío = derivado de la estimación. */
export function setTaskDates(state: AppState, id: string, dates: { start: string; due: string }) {
  const task = requireTask(state, id);
  const due = date(dates.due, { label: 'La fecha límite', required: true });
  const start = date(dates.start, { label: 'El inicio' });
  checkRange(start, due);
  task.start = start;
  task.due = due;
  return task;
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

/** Mueve o redimensiona un evento (arrastrarlo en el calendario); `projectId` solo si cambia de carpeta. */
export function rescheduleEvent(state: AppState, id: string, to: { date: string; start: string; end: string; projectId?: string }) {
  const event = state.events.find((e) => e.id === id);
  if (!event) throw new ValidationError('El evento ya no existe');
  const next = {
    date: date(to.date, { label: 'La fecha', required: true }),
    start: time(to.start, 'La hora de inicio'),
    end: time(to.end, 'La hora de fin'),
    projectId: to.projectId === undefined ? event.projectId : projectRef(state, to.projectId),
  };
  if (timeToMinutes(next.end) <= timeToMinutes(next.start)) throw new ValidationError('La hora de fin debe ser posterior a la de inicio');
  Object.assign(event, next);
  return event;
}

export function deleteEvent(state: AppState, id: string) {
  const index = state.events.findIndex((e) => e.id === id);
  if (index === -1) throw new ValidationError('El evento ya no existe');
  const [event] = state.events.splice(index, 1);
  return { event, index };
}

export const restoreEvent = (state: AppState, event: CalendarEvent, index: number) => restoreAt(state.events, event, index);

// ---------- carpetas ----------

const MAX_PHASES = 12;

/** «Fases» del formulario: una por línea, sin repetidas. Las que ya existían (mismo nombre) conservan su id. */
function parsePhases(value: unknown, current: Phase[], ctx: MutationContext): Phase[] {
  const names: string[] = [];
  for (const line of str(value).split(/\r?\n/)) {
    const name = line.trim();
    if (!name || names.some((n) => n.toLowerCase() === name.toLowerCase())) continue;
    if (name.length > 30) throw new ValidationError('Cada fase admite como máximo 30 caracteres', 'phases');
    names.push(name);
  }
  if (names.length > MAX_PHASES) throw new ValidationError(`Una carpeta admite como máximo ${MAX_PHASES} fases`, 'phases');
  return names.map((name) => ({ id: current.find((f) => f.name.toLowerCase() === name.toLowerCase())?.id ?? ctx.createId(), name }));
}

export function saveProject(state: AppState, input: FormInput, ctx: MutationContext) {
  const data = {
    name: text(input.name, { label: 'El nombre', max: 40, required: true, field: 'name' }),
    description: text(input.description, { label: 'La descripción', max: 80, field: 'description' }),
    color: oneOf(input.color, Object.keys(PROJECT_COLORS), 'El color'),
  };
  const existing = state.projects.find((p) => p.id === input.id);
  // sin el campo se conservan las fases; con él, una por línea (las que ya existían mantienen su id)
  const phases = 'phases' in input ? parsePhases(input.phases, existing?.phases ?? [], ctx) : existing?.phases ?? [];
  if (existing) {
    const gone = new Set(existing.phases.filter((f) => !phases.some((n) => n.id === f.id)).map((f) => f.id));
    for (const t of state.tasks) if (t.projectId === existing.id && gone.has(t.phaseId)) t.phaseId = '';
    Object.assign(existing, data, { phases });
    return { project: existing, created: false };
  }
  const project: Project = { id: ctx.createId(), ...data, members: [], phases };
  state.projects.push(project);
  return { project, created: true };
}

export function deleteProject(state: AppState, id: string) {
  const inUse = state.tasks.some((t) => t.projectId === id) || state.events.some((e) => e.projectId === id);
  if (inUse) throw new ValidationError('Mueve o elimina sus tareas y eventos antes de borrar la carpeta');
  const index = state.projects.findIndex((p) => p.id === id);
  if (index === -1) throw new ValidationError('La carpeta ya no existe');
  const [project] = state.projects.splice(index, 1);
  // su chat y sus documentos se van con ella; se devuelven para poder deshacer
  const messages = state.messages.filter((m) => m.projectId === id);
  const docs = state.docs.filter((d) => d.projectId === id);
  state.messages = state.messages.filter((m) => m.projectId !== id);
  state.docs = state.docs.filter((d) => d.projectId !== id);
  return { project, index, messages, docs };
}

export function restoreProject(state: AppState, removed: { project: Project; index: number; messages: ChatMessage[]; docs: ProjectDoc[] }) {
  restoreAt(state.projects, removed.project, removed.index);
  state.messages.push(...removed.messages);
  state.docs.push(...removed.docs);
}

// ---------- participantes, chat y documentos de una carpeta ----------

function projectById(state: AppState, id: unknown) {
  const project = state.projects.find((p) => p.id === id);
  if (!project) throw new ValidationError('La carpeta ya no existe');
  return project;
}

/** El autor es el usuario o un participante de la carpeta. */
function authorOf(project: Project, id: unknown) {
  if (id === undefined || id === '' || id === ME_ID) return ME_ID;
  if (!project.members.some((m) => m.id === id)) throw new ValidationError('El autor ya no participa en la carpeta');
  return id as string;
}

export function addMember(state: AppState, projectId: string, input: FormInput, ctx: MutationContext) {
  const project = projectById(state, projectId);
  const name = text(input.name, { label: 'El nombre', max: 30, required: true, field: 'name' });
  if (project.members.length >= 20) throw new ValidationError('Una carpeta admite como máximo 20 participantes');
  if ([state.settings.name, ...project.members.map((m) => m.name)].some((n) => n.toLowerCase() === name.toLowerCase())) throw new ValidationError('Ya hay un participante con ese nombre', 'name');
  const colors = Object.keys(PROJECT_COLORS);
  const member: Member = { id: ctx.createId(), name, color: colors[(project.members.length + 1) % colors.length] };
  project.members.push(member);
  return member;
}

/** Quita al participante; sus mensajes y documentos se conservan, firmados con su id. */
export function removeMember(state: AppState, projectId: string, memberId: string) {
  const project = projectById(state, projectId);
  const index = project.members.findIndex((m) => m.id === memberId);
  if (index === -1) throw new ValidationError('El participante ya no existe');
  const [member] = project.members.splice(index, 1);
  return { member, index };
}

export function restoreMember(state: AppState, projectId: string, member: Member, index: number) {
  const project = state.projects.find((p) => p.id === projectId);
  if (project) restoreAt(project.members, member, index);
}

export function postMessage(state: AppState, projectId: string, input: FormInput, ctx: MutationContext) {
  const project = projectById(state, projectId);
  const message: ChatMessage = {
    id: ctx.createId(),
    projectId,
    authorId: authorOf(project, input.authorId),
    text: text(input.text, { label: 'El mensaje', max: 1000, required: true, field: 'text' }),
    at: ctx.now,
  };
  state.messages.push(message);
  return message;
}

export function deleteMessage(state: AppState, id: string) {
  const index = state.messages.findIndex((m) => m.id === id);
  if (index === -1) throw new ValidationError('El mensaje ya no existe');
  const [message] = state.messages.splice(index, 1);
  return { message, index };
}

export const restoreMessage = (state: AppState, message: ChatMessage, index: number) => restoreAt(state.messages, message, index);

export function saveDoc(state: AppState, projectId: string, input: FormInput, ctx: MutationContext) {
  const project = projectById(state, projectId);
  const data = {
    kind: oneOf<DocKind>(input.kind, ['nota', 'documento'], 'El tipo'),
    title: text(input.title, { label: 'El título', max: 80, required: true, field: 'title' }),
    body: text(input.body, { label: 'El contenido', max: 20000, field: 'body' }),
    updatedAt: ctx.now,
  };
  const existing = state.docs.find((d) => d.id === input.id && d.projectId === projectId);
  if (existing) {
    Object.assign(existing, data);
    return { doc: existing, created: false };
  }
  const doc: ProjectDoc = { id: ctx.createId(), projectId, authorId: authorOf(project, input.authorId), ...data };
  state.docs.push(doc);
  return { doc, created: true };
}

export function deleteDoc(state: AppState, id: string) {
  const index = state.docs.findIndex((d) => d.id === id);
  if (index === -1) throw new ValidationError('El documento ya no existe');
  const [doc] = state.docs.splice(index, 1);
  return { doc, index };
}

export const restoreDoc = (state: AppState, doc: ProjectDoc, index: number) => restoreAt(state.docs, doc, index);

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
