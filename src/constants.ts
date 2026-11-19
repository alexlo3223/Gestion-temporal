import { Coffee, MessageSquare, Sprout, Target, type LucideIcon } from 'lucide-react';
import type { EventKind, HomeWidgetType, Priority, Project, ProjectSection, UiState } from './types';

export const STORAGE_KEY = 'gestor-tiempo';
/** Subir cuando cambie la forma de los datos guardados; los datos antiguos se descartan. */
export const SCHEMA_VERSION = 5;
/** Id del propio usuario como autor de mensajes y documentos. */
export const ME_ID = 'me';

export const PROJECT_SECTIONS: Record<ProjectSection, string> = { resumen: 'Resumen', tareas: 'Tareas', gantt: 'Gantt', chat: 'Chat', documentos: 'Documentos', notas: 'Notas' };

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

export const UNASSIGNED_PROJECT: Project = Object.freeze({ id: '', name: 'Sin carpeta', color: '#71717a', description: '', members: [], phases: [] });

export const CALENDAR = Object.freeze({ firstHour: 7, lastHour: 21, hourHeightPx: 56 });

export const DEFAULT_UI: UiState = Object.freeze({
  projects: [],
  priority: 'all',
  query: '',
  quick: [],
  period: 'week',
  drawer: null,
  fieldError: null,
  menuOpen: false,
}) as UiState;

/** Tipos de bloque de Inicio, en el orden de serie. `ref`: el bloque apunta a un proyecto o a una tarea. */
/** Tamaño por defecto de cada bloque, en celdas (`w` columnas × `h` filas). Cada bloque admite de 1 a 3 en cada medida. */
export const HOME_WIDGETS: Record<HomeWidgetType, { label: string; ref?: 'project' | 'task'; w: number; h: number }> = {
  meetings: { label: 'Tiempo en reuniones', w: 1, h: 1 },
  focusToday: { label: 'Foco registrado hoy', w: 1, h: 1 },
  tasksToday: { label: 'Tareas de hoy', w: 1, h: 1 },
  focusWeek: { label: 'Foco esta semana', w: 1, h: 1 },
  spotlight: { label: 'Siguiente evento', w: 2, h: 1 },
  timeline: { label: 'Agenda del día', w: 2, h: 2 },
  priorities: { label: 'Prioridades', w: 2, h: 2 },
  project: { label: 'Proyecto concreto', ref: 'project', w: 1, h: 1 },
  task: { label: 'Tarea concreta', ref: 'task', w: 1, h: 2 },
};
export const MAX_WIDGETS = 40;
/** Tamaño mínimo y máximo de un bloque en celdas. */
export const WIDGET_SIZE = { min: 1, max: 3 };
/** Columnas de la cuadrícula de Inicio según el ancho disponible (en píxeles). */
export const HOME_COLUMNS = (width: number) => (width >= 1200 ? 6 : width >= 900 ? 4 : width >= 560 ? 3 : width >= 380 ? 2 : 1);
/** Separación entre celdas, en píxeles (coincide con `gap-space-md`). */
export const HOME_GAP = 16;
