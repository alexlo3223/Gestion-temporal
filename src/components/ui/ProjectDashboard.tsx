import { ListChecks, ListPlus, Pencil } from 'lucide-react';
import { actions } from '../../actions';
import { projectStats, compareByPriority } from '../../store/selectors';
import { PROJECT_SECTIONS } from '../../constants';
import type { AppState, Project, ProjectSection } from '../../types';
import { ProjectChat } from './ProjectChat';
import { ProjectDocs } from './ProjectDocs';
import { ProjectGantt } from './ProjectGantt';
import { ColorDot, EmptyState, ProgressBar } from './primitives';
import { TaskRow } from './TaskRow';


function TasksPanel({ state, project, today }: { state: AppState; project: Project; today: string }) {
  const tasks = state.tasks.filter((t) => t.projectId === project.id).sort((a, b) => Number(a.status === 'done') - Number(b.status === 'done') || compareByPriority(a, b));
  return (
    <section className="card flex flex-col gap-space-sm" aria-label={`Tareas de ${project.name}`}>
      <div className="flex items-center justify-between gap-space-sm">
        <h2 className="flex items-center gap-space-xs text-headline-sm font-semibold">
          <ListChecks size={18} className="text-primary" aria-hidden="true" />
          Tareas
        </h2>
        <button type="button" className="btn btn-ghost" onClick={() => actions.openDrawer({ type: 'task', defaults: { projectId: project.id, due: today } })}>
          <ListPlus size={16} aria-hidden="true" />
          Nueva tarea
        </button>
      </div>
      <div className="flex max-h-80 flex-col gap-0.5 scroll-contain overflow-y-auto">
        {tasks.length ? tasks.map((t) => <TaskRow key={t.id} task={t} state={state} today={today} />) : <EmptyState>Esta carpeta aún no tiene tareas.</EmptyState>}
      </div>
    </section>
  );
}

/**
 * Contenido de una carpeta. `resumen` es el mini-dashboard completo (cabecera, tareas, gantt, chat, documentos y notas);
 * el resto de secciones muestran solo su panel, que es lo que abre el árbol.
 */
export function ProjectDashboard({
  state,
  project,
  section = 'resumen',
  today,
  docId,
  onDoc,
}: {
  state: AppState;
  project: Project;
  section?: ProjectSection;
  today: string;
  docId?: string;
  onDoc?: (id: string | undefined) => void;
}) {
  const stats = projectStats(state, project.id);
  const docs = (kind?: 'nota' | 'documento') => <ProjectDocs key={kind ?? 'all'} state={state} project={project} kind={kind} selectedId={docId} onSelect={onDoc} />;
  return (
    <div className="flex min-w-0 flex-col gap-space-md">
      <header className="card flex flex-col gap-space-sm">
        <div className="flex flex-wrap items-center justify-between gap-space-sm">
          <div className="min-w-0">
            <h2 className="flex items-center gap-space-xs text-headline-md font-semibold">
              <ColorDot color={project.color} size={12} />
              <span className="truncate">{project.name}</span>
              <span className="text-label-md font-normal text-outline">· {PROJECT_SECTIONS[section]}</span>
            </h2>
            {project.description && <p className="text-body-sm text-on-surface-variant">{project.description}</p>}
          </div>
          <button type="button" className="icon-btn" onClick={() => actions.openDrawer({ type: 'project', projectId: project.id })} aria-label={`Editar ${project.name}`} title="Editar carpeta">
            <Pencil size={16} aria-hidden="true" />
          </button>
        </div>
        <div className="flex items-center gap-space-md text-label-sm text-on-surface-variant">
          <span className="whitespace-nowrap">
            {stats.done} / {stats.total} tareas · {state.messages.filter((m) => m.projectId === project.id).length} mensajes · {project.members.length + 1} participantes
          </span>
          <ProgressBar percent={stats.percent} color={project.color} className="h-1.5 flex-1" />
          <span className="font-mono" style={{ color: project.color }}>
            {stats.percent}%
          </span>
        </div>
      </header>
      {section === 'resumen' && (
        <>
          <div className="grid gap-space-md xl:grid-cols-2">
            <TasksPanel state={state} project={project} today={today} />
            <ProjectChat state={state} project={project} />
          </div>
          <ProjectGantt state={state} projectId={project.id} />
          {docs()}
        </>
      )}
      {section === 'tareas' && <TasksPanel state={state} project={project} today={today} />}
      {section === 'gantt' && <ProjectGantt state={state} projectId={project.id} />}
      {section === 'chat' && <ProjectChat state={state} project={project} />}
      {section === 'documentos' && docs('documento')}
      {section === 'notas' && docs('nota')}
    </div>
  );
}

