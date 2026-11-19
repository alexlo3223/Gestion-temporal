import { Coffee, MessageSquare, Sprout, Target, type LucideIcon } from 'lucide-react';
import type { EventKind, HomeWidgetId, Priority, Project, UiState } from './types';

export const STORAGE_KEY = 'gestor-tiempo';
/** Subir cuando cambie la forma de los datos guardados; los datos antiguos se descartan. */
export const SCHEMA_VERSION = 2;

export const TASK_STATUSES = ['todo', 'doing', 'done'] as const;

// Las clases van completas (sin concatenar) para que Tailwind las detecte al compilar.
export const PRIORITIES: Record<Priority, { label: string; weight: number; badgeClass: string }> = {
  urgente: { label: 'Urgente', weight: 0, badgeClass: 'bg-error-container text-on-error-container' },
  alta: { label: 'Alta', weight: 1, badgeClass: 'bg-surface-container-highest text-secondary' },
  normal: { label: 'Normal', weight: 2, badgeClass: 'bg-surface-container-high text-outline' },
  baja: { label: 'Baja', weight: 3, badgeClass: 'bg-surface-container-lowest text-outline' },
};

export const EVENT_KINDS: Record<EventKind, { label: string; Icon: LucideIcon }> = {
  reunion: { label: 'Reunión', Icon: MessageSquare },
  foco: { label: 'Bloque foco', Icon: Target },
  pausa: { label: 'Pausa', Icon: Coffee },
  personal: { label: 'Personal', Icon: Sprout },
};

export const PROJECT_COLORS: Record<string, string> = {
  '#3b82f6': 'Azul',
  '#10b981': 'Esmeralda',
  '#f59e0b': 'Ámbar',
  '#f43f5e': 'Rosa',
  '#8b5cf6': 'Violeta',
  '#a1a1aa': 'Zinc',
};

export const TIMEZONES: Record<string, string> = {
  'America/New_York': 'Nueva York',
  'America/Los_Angeles': 'San Francisco',
  'America/Mexico_City': 'Ciudad de México',
  'America/Bogota': 'Bogotá',
  'Europe/London': 'Londres',
  'Asia/Tokyo': 'Tokio',
  UTC: 'UTC',
};

export const UNASSIGNED_PROJECT: Project = Object.freeze({ id: '', name: 'Sin carpeta', color: '#71717a', description: '' });

export const CALENDAR = Object.freeze({ firstHour: 7, lastHour: 21, hourHeightPx: 56 });

export const DEFAULT_UI: UiState = Object.freeze({
  projects: [],
  priority: 'all',
  query: '',
  quick: [],
  calendarView: 'week',
  calendarOffset: 0,
  period: 'week',
  drawer: null,
  fieldError: null,
  menuOpen: false,
}) as UiState;

/** Bloques de Inicio y su sitio de serie en la cuadrícula de 12 columnas. `tall`: ocupa dos filas. */
export const HOME_WIDGETS: Record<HomeWidgetId, { label: string; span: number; col: number; row: number; tall?: boolean }> = {
  meetings: { label: 'Tiempo en reuniones', span: 3, col: 1, row: 1 },
  focusToday: { label: 'Foco registrado hoy', span: 3, col: 4, row: 1 },
  tasksToday: { label: 'Tareas de hoy', span: 3, col: 7, row: 1 },
  focusWeek: { label: 'Foco esta semana', span: 3, col: 10, row: 1 },
  spotlight: { label: 'Siguiente evento', span: 5, col: 1, row: 2 },
  timeline: { label: 'Agenda del día', span: 7, col: 6, row: 2, tall: true },
  priorities: { label: 'Prioridades', span: 5, col: 1, row: 3 },
  projects: { label: 'Proyectos en ejecución', span: 12, col: 1, row: 4 },
};
export const GRID_COLS = 12;
export const MIN_SPAN = 2;
export const MAX_ROWS = 40;
