// Datos de muestra generados relativos a "hoy" para que la app siempre tenga contenido realista.
import { ME_ID, SCHEMA_VERSION } from '../constants';
import { addDays, offsetISO, startOfWeek, toISODate, todayISO } from '../lib/dates';
import type { AppState, CalendarEvent, EventKind, FocusLog, Priority, Project, Task, TaskStatus } from '../types';
import { createIdleTimer } from './timer';

const PHASES = { design: { id: 'ph-design', name: 'Diseño' }, build: { id: 'ph-build', name: 'Desarrollo' }, review: { id: 'ph-review', name: 'Revisión' } };

const LAURA = { id: 'laura', name: 'Laura', color: '#ec4899' };
const MARC = { id: 'marc', name: 'Marc', color: '#14b8a6' };

const PROJECTS: Project[] = [
  { id: 'app', name: 'App Móvil', color: '#3b82f6', description: 'Aplicación iOS/Android de reservas', members: [LAURA, MARC], phases: [PHASES.design, PHASES.build, PHASES.review] },
  { id: 'web', name: 'Web Corporativa', color: '#10b981', description: 'Rediseño completo del sitio', members: [LAURA], phases: [PHASES.design, PHASES.build] },
  { id: 'nova', name: 'Cliente Nova', color: '#f59e0b', description: 'Consultoría y presupuesto', members: [MARC], phases: [] },
  { id: 'form', name: 'Formación', color: '#8b5cf6', description: 'Cursos y lecturas', members: [], phases: [] },
  { id: 'pers', name: 'Personal', color: '#f43f5e', description: 'Gestiones y hábitos', members: [], phases: [] },
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
  ['Hito: diseño aprobado', 'app', 'normal', 'todo', 0, 4],
  ['Pruebas de integración', 'app', 'alta', 'todo', 180, 10, 'Flujos de pago y login de extremo a extremo.'],
  ['Publicar en tiendas', 'app', 'normal', 'todo', 60, 14, 'Fichas, capturas y revisión de Apple y Google.'],
  ['Hito: beta lanzada', 'app', 'alta', 'todo', 0, 14],
  ['Desarrollar landing', 'web', 'normal', 'todo', 300, 9, 'Maquetado responsive a partir de los textos.'],
  ['Revisión de contenidos', 'web', 'baja', 'todo', 60, 12],
];

/** Fase de las tareas de muestra que la tienen (por título). */
const TASK_PHASES: Record<string, string> = {
  'Diseñar pantalla de login': PHASES.design.id,
  'Wireframes del onboarding': PHASES.design.id,
  'Conectar API de pagos': PHASES.build.id,
  'Redactar textos de la home': PHASES.design.id,
  'Optimizar imágenes': PHASES.build.id,
  'Hito: diseño aprobado': PHASES.design.id,
  'Pruebas de integración': PHASES.build.id,
  'Publicar en tiendas': PHASES.review.id,
  'Hito: beta lanzada': PHASES.review.id,
  'Desarrollar landing': PHASES.build.id,
};

/** Inicio de algunas tareas, en días desde hoy (las demás se derivan de la fecha límite y la estimación). */
const TASK_START: Record<string, number> = {
  'Conectar API de pagos': -2,
  'Pruebas de integración': 5,
  'Desarrollar landing': 3,
};

/** Predecesoras: cada tarea espera a que acaben las suyas (flechas en el gantt). */
const TASK_DEPENDS: Record<string, string[]> = {
  'Hito: diseño aprobado': ['Diseñar pantalla de login'],
  'Pruebas de integración': ['Conectar API de pagos', 'Diseñar pantalla de login'],
  'Publicar en tiendas': ['Pruebas de integración'],
  'Hito: beta lanzada': ['Publicar en tiendas'],
  'Desarrollar landing': ['Redactar textos de la home'],
};

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

/** Mensajes y documentos de ejemplo (relativos a "ahora") para que las carpetas con participantes no estén vacías. */
function sampleCollaboration(now: Date): Pick<AppState, 'messages' | 'docs'> {
  const at = (minutesAgo: number) => now.getTime() - minutesAgo * 60_000;
  const msg = (n: number, projectId: string, authorId: string, text: string, minutesAgo: number) => ({ id: `sample-msg-${n}`, projectId, authorId, text, at: at(minutesAgo) });
  const doc = (n: number, projectId: string, kind: 'nota' | 'documento', title: string, body: string, authorId: string, minutesAgo: number) => ({ id: `sample-doc-${n}`, projectId, kind, title, body, authorId, updatedAt: at(minutesAgo) });
  return {
    messages: [
      msg(1, 'app', 'laura', 'He subido los wireframes del onboarding, ¿les echáis un ojo?', 180),
      msg(2, 'app', ME_ID, 'Perfecto, hoy termino la pantalla de login.', 150),
      msg(3, 'app', 'marc', 'Yo me encargo de la API de pagos esta semana.', 60),
      msg(4, 'nova', 'marc', 'El cliente quiere el presupuesto antes del viernes.', 240),
    ],
    docs: [
      doc(1, 'app', 'documento', 'Requisitos de la app', 'Reservas, pagos y notificaciones push.\n\nPrioridad 1: login y onboarding.', 'laura', 2880),
      doc(2, 'app', 'nota', 'Decisiones de diseño', 'Usar tipografía del sistema y modo oscuro desde el inicio.', ME_ID, 600),
      doc(3, 'nova', 'nota', 'Notas de la llamada', 'Alcance: consultoría de 3 fases. Presupuesto por horas.', 'marc', 1440),
    ],
  };
}

export function createSampleData({ now = new Date(), createId }: { now?: Date; createId: () => string }): AppState {
  const today = todayISO(now);
  const monday = startOfWeek(now);
  const event = (date: string, [start, end, title, projectId, kind]: EventRow): CalendarEvent => ({ id: createId(), date, start, end, title, projectId, kind });

  const tasks: Task[] = TASKS.map(([title, projectId, priority, status, estimateMin, dueOffset, description = '', spentMin = 0]) => {
    const due = dueOffset === null ? '' : offsetISO(dueOffset, now);
    const start = TASK_START[title] === undefined ? '' : offsetISO(TASK_START[title], now);
    return { id: createId(), title, description, projectId, phaseId: TASK_PHASES[title] ?? '', priority, status, estimateMin, spentMin, start, dependsOn: [], due, doneAt: status === 'done' ? due : '' };
  });
  // las dependencias apuntan a ids, así que se resuelven cuando ya existen todas las tareas
  const idOf = new Map(tasks.map((t) => [t.title, t.id]));
  for (const task of tasks) task.dependsOn = (TASK_DEPENDS[task.title] ?? []).map((title) => idOf.get(title)).filter((id): id is string => !!id);

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
    projects: PROJECTS.map((p) => ({ ...p, members: p.members.map((m) => ({ ...m })), phases: p.phases.map((f) => ({ ...f })) })),
    tasks,
    events,
    logs,
    ...sampleCollaboration(now),
    timer: createIdleTimer(),
  };
}
