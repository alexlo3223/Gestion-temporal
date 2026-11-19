// Traduce las tareas al modelo del Gantt de ReUI (filas en árbol + eventos con fecha) y las fechas de vuelta.
import type { GanttEvent, GanttResource } from '@/components/reui/gantt/gantt-types';
import type { AppState, Project, Task } from '../types';
import { addDays, parseISODate, toISODate } from './dates';
import { taskRange } from '../store/selectors';

export const NO_PHASE_LABEL = 'Sin fase';
export const ALL_TASKS_LABEL = 'Tareas';

export interface GanttData {
  resources: GanttResource[];
  events: GanttEvent[];
  /** Tareas que no salen en el gantt por no tener fecha límite. */
  undated: number;
}

/** Porcentaje de avance: hecha = 100; si no, lo dedicado sobre lo estimado (nunca 100 hasta terminarla). */
export const taskProgress = (task: Task) => (task.status === 'done' ? 100 : task.estimateMin ? Math.min(99, Math.round((task.spentMin / task.estimateMin) * 100)) : 0);

/**
 * Árbol de filas y barras. Cada fila es una fase de la carpeta y en ella caben varias tareas: si se solapan, se apilan en
 * carriles (scheduleMode "multiple"). Una carpeta sin fases tiene una sola fila con todas sus tareas. En la vista global,
 * cada carpeta es un grupo que contiene sus filas.
 */
export function buildGantt(state: AppState, projectId?: string): GanttData {
  const events: GanttEvent[] = [];
  let undated = 0;

  /** Añade las barras de `list` en la fila `rowId`; devuelve si quedó alguna con fecha. */
  const place = (list: Task[], rowId: string, project: Project) => {
    let dated = false;
    for (const task of list) {
      const range = taskRange(state, task);
      if (!range) {
        undated++;
        continue;
      }
      dated = true;
      const milestone = range.start === range.end && !task.estimateMin && !task.start;
      events.push({
        id: task.id,
        title: task.title,
        start: parseISODate(range.start),
        // el fin del gantt es exclusivo: la fecha límite es el último día; un hito tiene inicio y fin iguales
        end: milestone ? parseISODate(range.start) : addDays(parseISODate(range.end), 1),
        allDay: true,
        color: project.color,
        resourceId: rowId,
        progress: taskProgress(task),
      });
    }
    return dated;
  };

  const rowsOf = (project: Project, tasks: Task[]): GanttResource[] => {
    if (project.phases.length === 0) {
      const id = `${project.id}::all`;
      return place(tasks, id, project) ? [{ id, title: ALL_TASKS_LABEL }] : [];
    }
    const rows: GanttResource[] = [];
    for (const phase of project.phases) {
      const id = `${project.id}::${phase.id}`;
      if (place(tasks.filter((t) => t.phaseId === phase.id), id, project)) rows.push({ id, title: phase.name });
    }
    const loose = tasks.filter((t) => !project.phases.some((f) => f.id === t.phaseId));
    const looseId = `${project.id}::none`;
    if (place(loose, looseId, project)) rows.push({ id: looseId, title: NO_PHASE_LABEL });
    return rows;
  };

  const projects = state.projects.filter((p) => !projectId || p.id === projectId);
  const resources = projects.flatMap<GanttResource>((project) => {
    const rows = rowsOf(project, state.tasks.filter((t) => t.projectId === project.id));
    if (rows.length === 0) return [];
    return projectId ? rows : [{ id: `project::${project.id}`, title: project.name, color: project.color, children: rows }];
  });

  // flechas: cada tarea enlaza con sus predecesoras que también se ven en el gantt
  const byId = new Map(state.tasks.map((t) => [t.id, t]));
  const shown = new Set(events.map((e) => e.id));
  for (const e of events) {
    const deps = (byId.get(String(e.id))?.dependsOn ?? []).filter((id) => shown.has(id));
    if (deps.length) e.dependencies = deps;
  }
  return { resources, events, undated };
}

/** Fechas ISO de una barra movida o redimensionada: el fin exclusivo del gantt vuelve a ser la fecha límite (último día). */
export function rangeToISO(start: Date, end: Date) {
  const midnight = end.getHours() === 0 && end.getMinutes() === 0 && end.getSeconds() === 0 && end.getMilliseconds() === 0;
  const last = midnight ? addDays(end, -1) : end;
  const first = toISODate(start);
  const due = toISODate(last);
  return { start: first, due: due < first ? first : due };
}
