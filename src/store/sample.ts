// Datos de muestra generados relativos a "hoy" para que la app siempre tenga contenido realista.
import { SCHEMA_VERSION } from '../constants';
import { addDays, offsetISO, startOfWeek, toISODate, todayISO } from '../lib/dates';
import type { AppState, CalendarEvent, EventKind, FocusLog, Priority, Project, Task, TaskStatus } from '../types';
import { createIdleTimer } from './timer';

const PROJECTS: Project[] = [
  { id: 'app', name: 'App Móvil', color: '#3b82f6', description: 'Aplicación iOS/Android de reservas' },
  { id: 'web', name: 'Web Corporativa', color: '#10b981', description: 'Rediseño completo del sitio' },
  { id: 'nova', name: 'Cliente Nova', color: '#f59e0b', description: 'Consultoría y presupuesto' },
  { id: 'form', name: 'Formación', color: '#8b5cf6', description: 'Cursos y lecturas' },
  { id: 'pers', name: 'Personal', color: '#f43f5e', description: 'Gestiones y hábitos' },
];

type TaskRow = [title: string, projectId: string, priority: Priority, status: TaskStatus, estimateMin: number, dueOffset: number | null, description?: string, spentMin?: number];
const TASKS: TaskRow[] = [
  ['Diseñar pantalla de login', 'app', 'urgente', 'doing', 120, 0, 'Flujo email + Google, estados de error y vacío.', 70],
  ['Preparar presupuesto', 'nova', 'alta', 'todo', 60, 0, 'Desglose por fases y horas estimadas.'],
  ['Conectar API de pagos', 'app', 'alta', 'todo', 240, 2, 'Stripe en modo test, webhooks incluidos.'],
  ['Redactar textos de la home', 'web', 'normal', 'todo', 90, 3],
  ['Optimizar imágenes', 'web', 'baja', 'todo', 45, 5, 'Pasar todo a WebP y carga diferida.'],
  ['Curso TypeScript – módulo 3', 'form', 'normal', 'doing', 120, 6, 'Genéricos y tipos utilitarios.', 40],
  ['Revisar contrato de hosting', 'pers', 'baja', 'todo', 30, null],
  ['Facturar horas de octubre', 'nova', 'alta', 'todo', 30, -1],
  ['Reunión kick-off Nova', 'nova', 'normal', 'done', 60, -3, '', 60],
  ['Renovar dominio', 'pers', 'baja', 'done', 10, -4, '', 10],
  ['Wireframes del onboarding', 'app', 'normal', 'done', 90, 0, '', 95],
];

type EventRow = [start: string, end: string, title: string, projectId: string, kind: EventKind];
// [día de la semana (0 = lunes), ...evento]
const WEEK_EVENTS: [number, ...EventRow][] = [
  [0, '09:00', '10:00', 'Sprint planning', 'app', 'reunion'],
  [0, '14:00', '15:30', 'Maquetar home', 'web', 'foco'],
  [1, '10:00', '11:00', 'Llamada con Nova', 'nova', 'reunion'],
  [2, '10:00', '13:00', 'API de pagos', 'app', 'foco'],
  [2, '13:30', '14:30', 'Almuerzo', 'pers', 'pausa'],
  [3, '08:00', '09:00', 'Curso TS', 'form', 'foco'],
  [3, '13:00', '15:00', 'Reunión Nova', 'nova', 'reunion'],
  [4, '09:00', '10:30', 'Textos web', 'web', 'foco'],
  [4, '16:00', '17:00', 'Revisión semanal', 'pers', 'reunion'],
  [5, '10:00', '12:00', 'Gimnasio', 'pers', 'personal'],
];

const TODAY_EVENTS: EventRow[] = [
  ['08:30', '09:00', 'Planificación e inbox', 'pers', 'personal'],
  ['09:30', '11:30', 'Foco: pantalla de login', 'app', 'foco'],
  ['12:00', '12:30', 'Daily con el equipo', 'app', 'reunion'],
  ['13:30', '14:30', 'Almuerzo', 'pers', 'pausa'],
  ['15:00', '16:00', 'Presupuesto Nova', 'nova', 'reunion'],
  ['16:30', '18:00', 'Curso TypeScript', 'form', 'foco'],
];

const LOGGED_PROJECTS = ['app', 'web', 'nova', 'form'];
const HISTORY_DAYS = 60;

export function createSampleData({ now = new Date(), createId }: { now?: Date; createId: () => string }): AppState {
  const today = todayISO(now);
  const monday = startOfWeek(now);
  const event = (date: string, [start, end, title, projectId, kind]: EventRow): CalendarEvent => ({ id: createId(), date, start, end, title, projectId, kind });

  const tasks: Task[] = TASKS.map(([title, projectId, priority, status, estimateMin, dueOffset, description = '', spentMin = 0]) => {
    const due = dueOffset === null ? '' : offsetISO(dueOffset, now);
    return { id: createId(), title, description, projectId, priority, status, estimateMin, spentMin, due, doneAt: status === 'done' ? due : '' };
  });

  const events = [
    ...WEEK_EVENTS.map(([weekday, ...rest]) => event(toISODate(addDays(monday, weekday)), rest)).filter((e) => e.date !== today),
    ...TODAY_EVENTS.map((row) => event(today, row)),
  ];

  // Historial de foco en días laborables, con cantidades variadas pero deterministas.
  const logs: FocusLog[] = [];
  for (let daysAgo = 0; daysAgo < HISTORY_DAYS; daysAgo++) {
    const day = addDays(now, -daysAgo);
    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
    if (daysAgo > 0 && isWeekend) continue;
    const sessions = daysAgo === 0 ? 1 : 2;
    for (let s = 0; s < sessions; s++) {
      logs.push({
        id: createId(),
        date: toISODate(day),
        projectId: LOGGED_PROJECTS[(daysAgo + s * 2) % LOGGED_PROJECTS.length],
        taskId: '',
        minutes: daysAgo === 0 ? 70 : 45 + ((daysAgo * 37 + s * 53) % 150),
      });
    }
  }

  return {
    version: SCHEMA_VERSION,
    settings: { name: 'Alex', secondTimezone: 'America/New_York', workStart: 9, workEnd: 18, pomodoroMinutes: 25, weeklyGoalHours: 25, notify: false },
    projects: PROJECTS.map((p) => ({ ...p })),
    tasks,
    events,
    logs,
    timer: createIdleTimer(),
  };
}
