export type Priority = 'urgente' | 'alta' | 'normal' | 'baja';
export type TaskStatus = 'todo' | 'doing' | 'done';
export type EventKind = 'reunion' | 'foco' | 'pausa' | 'personal';
export type Period = 'week' | 'month';
/** Filtros rápidos del tablero, combinables entre sí (se suman). */
export type QuickFilter = 'today' | 'late' | 'nodate';
/** Rango de fechas ISO [desde, hasta], ambos incluidos. */
export type DateRange = [string, string];

/** Participante de una carpeta. El usuario no se guarda aquí: es siempre `ME_ID` (con el nombre de los ajustes). */
export interface Member {
  id: string;
  name: string;
  color: string;
}

/** Fase de una carpeta (p. ej. Diseño, Desarrollo). Las tareas se agrupan por ella en el cascader y en el gantt. */
export interface Phase {
  id: string;
  name: string;
}

export interface Project {
  id: string;
  name: string;
  color: string;
  description: string;
  members: Member[];
  phases: Phase[];
}

export interface ChatMessage {
  id: string;
  projectId: string;
  authorId: string;
  text: string;
  /** Marca de tiempo (ms). */
  at: number;
}

export type DocKind = 'nota' | 'documento';

/** Nota o documento compartido de una carpeta. */
export interface ProjectDoc {
  id: string;
  projectId: string;
  kind: DocKind;
  title: string;
  body: string;
  /** Marca de tiempo (ms) de la última edición. */
  updatedAt: number;
  authorId: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  projectId: string;
  /** Fase de su carpeta, o '' si no tiene. */
  phaseId: string;
  priority: Priority;
  status: TaskStatus;
  estimateMin: number;
  spentMin: number;
  /** Fecha de inicio ISO, o '' para derivarla de la fecha límite y la estimación. */
  start: string;
  /** Tareas que deben acabar antes (dependencias finish-to-start, se dibujan como flechas en el gantt). */
  dependsOn: string[];
  /** Fecha límite ISO, o '' si no tiene. */
  due: string;
  /** Fecha ISO en que se completó, o '' si no está completada. */
  doneAt: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  projectId: string;
  kind: EventKind;
  date: string;
  /** HH:MM */
  start: string;
  /** HH:MM */
  end: string;
}

/** Minutos de foco registrados con el temporizador. */
export interface FocusLog {
  id: string;
  date: string;
  projectId: string;
  /** '' si no corresponde a una tarea concreta. */
  taskId: string;
  minutes: number;
}

export interface Timer {
  taskId: string | null;
  /** Marca de tiempo (ms) de cuando se reanudó por última vez; null si está en pausa o parado. */
  startedAt: number | null;
  accumulatedMs: number;
}

export type HomeWidgetType = 'meetings' | 'focusToday' | 'tasksToday' | 'focusWeek' | 'spotlight' | 'priorities' | 'timeline' | 'project' | 'task';
/**
 * Un bloque de Inicio, medido en celdas cuadradas de la cuadrícula: `w` columnas y `h` filas, de 1 a 3.
 * `project` y `task` apuntan a un proyecto o tarea concretos mediante `ref`. `id` es único: el tipo en los fijos y `tipo:ref` en los de referencia.
 */
export interface HomeWidget {
  id: string;
  type: HomeWidgetType;
  ref?: string;
  w?: number;
  h?: number;
}

/** Secciones de una carpeta de proyecto: cada una cuelga del menú lateral (`#projects/<id>/<sección>`). */
export type ProjectSection = 'resumen' | 'tareas' | 'gantt' | 'chat' | 'documentos' | 'notas';

export interface Settings {
  name: string;
  secondTimezone: string;
  workStart: number;
  workEnd: number;
  pomodoroMinutes: number;
  weeklyGoalHours: number;
  notify: boolean;
  /** Distribución de Inicio elegida por el usuario; sin ella, la de serie. */
  homeLayout?: HomeWidget[];
}

export interface AppState {
  version: number;
  settings: Settings;
  projects: Project[];
  tasks: Task[];
  events: CalendarEvent[];
  logs: FocusLog[];
  messages: ChatMessage[];
  docs: ProjectDoc[];
  timer: Timer;
}

export interface MutationContext {
  now: number;
  today: string;
  createId: () => string;
}

/** Datos crudos de un formulario (FormData → objeto). Se validan en store/mutations. */
export type FormInput = Record<string, FormDataEntryValue | FormDataEntryValue[] | undefined>;

export type DrawerState =
  | { type: 'task'; taskId?: string; defaults?: { projectId?: string; due?: string } }
  | { type: 'event'; eventId?: string; defaults?: { date?: string; start?: string; end?: string; projectId?: string } }
  | { type: 'project'; projectId?: string }
  | null;

/** Estado de la interfaz. No se guarda. */
export interface UiState {
  /** Carpetas por las que se filtran las tareas; vacío = todas. */
  projects: string[];
  priority: Priority | 'all';
  query: string;
  quick: QuickFilter[];
  period: Period;
  drawer: DrawerState;
  /** Último error de validación de un campo concreto del formulario abierto. */
  fieldError: { field: string; message: string } | null;
  menuOpen: boolean;
}
