export type Priority = 'urgente' | 'alta' | 'normal' | 'baja';
export type TaskStatus = 'todo' | 'doing' | 'done';
export type EventKind = 'reunion' | 'foco' | 'pausa' | 'personal';
export type Period = 'week' | 'month';
/** Vista del calendario: semana, mes o un día con una columna por carpeta. */
export type CalendarMode = 'week' | 'month' | 'projects';
/** Filtros rápidos del tablero, combinables entre sí (se suman). */
export type QuickFilter = 'today' | 'late' | 'nodate';
/** Rango de fechas ISO [desde, hasta], ambos incluidos. */
export type DateRange = [string, string];

export interface Project {
  id: string;
  name: string;
  color: string;
  description: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  projectId: string;
  priority: Priority;
  status: TaskStatus;
  estimateMin: number;
  spentMin: number;
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

export type HomeWidgetId = 'meetings' | 'focusToday' | 'tasksToday' | 'focusWeek' | 'spotlight' | 'priorities' | 'timeline' | 'projects';
/** Un bloque de Inicio: columna y fila donde empieza (desde 1) y cuántas columnas ocupa (de 12). */
export interface HomeWidget {
  id: HomeWidgetId;
  span: number;
  col: number;
  row: number;
}

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
  timer: Timer;
}

export interface MutationContext {
  now: number;
  today: string;
  createId: () => string;
}

/** Datos crudos de un formulario (FormData → objeto). Se validan en store/mutations. */
export type FormInput = Record<string, FormDataEntryValue | undefined>;

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
  calendarView: CalendarMode;
  /** Desplazamiento del calendario en unidades de la vista (semanas, meses o días). */
  calendarOffset: number;
  period: Period;
  drawer: DrawerState;
  /** Último error de validación de un campo concreto del formulario abierto. */
  fieldError: { field: string; message: string } | null;
  menuOpen: boolean;
}
