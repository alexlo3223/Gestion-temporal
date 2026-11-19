import { CalendarPlus, ChevronDown, Folder, FolderOpen, ListChecks, ListPlus, Pencil } from 'lucide-react';
import { actions } from '../../actions';
import { navigate } from '../../hooks/useHashRoute';
import { formatDueLabel, formatDuration } from '../../lib/format';
import { projectStats } from '../../store/selectors';
import type { AppState, Project } from '../../types';
import { ActionNode } from '../blocks/ActionNode';
import { ProgressBar } from './primitives';

export const openProjectTasks = (projectId: string) => {
  actions.filterProjects([projectId]);
  actions.search('');
  navigate('tasks');
};

/** Una carpeta como ActionNode: sus acciones rápidas salen de la esquina. */
/** Con `onToggle` la carpeta también se despliega en su sitio (el clic en el título sigue llevando a sus tareas). */
export function ProjectNode({ project, state, today, expanded = false, onToggle }: { project: Project; state: AppState; today: string; expanded?: boolean; onToggle?: () => void }) {
  const stats = projectStats(state, project.id);
  return (
    <ActionNode
      title={project.name}
      description={project.description}
      Mark={expanded ? FolderOpen : Folder}
      accent={project.color}
      onOpen={() => openProjectTasks(project.id)}
      openLabel={`Ver tareas de ${project.name}`}
      actions={[
        { id: 'tasks', label: 'Ver tareas', Icon: ListChecks, onSelect: () => openProjectTasks(project.id) },
        { id: 'task', label: 'Nueva tarea', Icon: ListPlus, onSelect: () => actions.openDrawer({ type: 'task', defaults: { projectId: project.id, due: today } }) },
        { id: 'event', label: 'Nuevo evento', Icon: CalendarPlus, onSelect: () => actions.openDrawer({ type: 'event', defaults: { date: today } }) },
        { id: 'edit', label: 'Editar carpeta', Icon: Pencil, onSelect: () => actions.openDrawer({ type: 'project', projectId: project.id }) },
      ]}
      footer={
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-label-sm">
            <span className="text-on-surface-variant">
              {stats.done} / {stats.total} tareas
            </span>
            <span className="font-mono" style={{ color: project.color }}>
              {stats.percent}%
            </span>
          </div>
          <ProgressBar percent={stats.percent} color={project.color} />
          <div className="flex items-center justify-between text-label-sm text-outline">
            <span>{stats.nextDue ? `Próxima: ${formatDueLabel(stats.nextDue.due, today)}` : 'Sin pendientes'}</span>
            <span>{formatDuration(stats.minutes)} de foco</span>
          </div>
          {onToggle && (
            // relative z-[2]: por encima del área clicable de la tarjeta (.nod-open::after)
            <button type="button" onClick={onToggle} aria-expanded={expanded} className="relative z-[2] mt-1 flex items-center justify-center gap-1 rounded-lg py-1 text-label-sm text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface">
              <ChevronDown size={14} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} aria-hidden="true" />
              {expanded ? 'Cerrar carpeta' : 'Abrir carpeta'}
            </button>
          )}
        </div>
      }
    />
  );
}
