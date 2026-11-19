import { ArrowLeft, FolderPlus, Plus } from 'lucide-react';
import { Fragment, useState } from 'react';
import { actions } from '../actions';
import { PROJECT_SECTIONS } from '../constants';
import { navigate } from '../hooks/useHashRoute';
import { PageHeader } from '../components/ui/primitives';
import { ProjectDashboard } from '../components/ui/ProjectDashboard';
import { ProjectNode } from '../components/ui/ProjectNode';
import { todayISO } from '../lib/dates';
import type { ViewProps } from '../routes';
import type { ProjectSection } from '../types';

const isSection = (value: string | undefined): value is ProjectSection => value !== undefined && Object.hasOwn(PROJECT_SECTIONS, value);

export function ProjectsView({ state, params = [] }: ViewProps) {
  const today = todayISO();
  const [open, setOpen] = useState<string | null>(null);
  const [id, sectionParam, docId] = params;
  const project = state.projects.find((p) => p.id === id);

  /* #projects/<carpeta>[/<sección>[/<documento>]]: el panel de una carpeta, al que se llega desde el menú lateral */
  if (project) {
    const section = isSection(sectionParam) ? sectionParam : 'resumen';
    return (
      <div className="flex flex-col gap-space-md">
        <a href="#projects" className="inline-flex items-center gap-1 self-start text-label-md text-outline hover:text-on-surface">
          <ArrowLeft size={14} aria-hidden="true" />
          Todas las carpetas
        </a>
        <h1 className="sr-only">
          {project.name} · {PROJECT_SECTIONS[section]}
        </h1>
        <ProjectDashboard
          key={`${project.id}-${section}`}
          state={state}
          project={project}
          section={section}
          today={today}
          docId={docId}
          onDoc={(next) => navigate(`projects/${encodeURIComponent(project.id)}/${section}${next ? `/${encodeURIComponent(next)}` : ''}`)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-space-xs">
      <PageHeader
        kicker={`${state.projects.length} carpetas · ${state.tasks.length} tareas`}
        title="Proyectos"
        actions={
          <button type="button" onClick={() => actions.openDrawer({ type: 'project' })} className="btn btn-primary">
            <FolderPlus size={16} aria-hidden="true" />
            Nueva carpeta
          </button>
        }
      />
      <p className="text-body-sm text-outline">Pulsa el nombre para ir a sus tareas, o «Abrir carpeta» para ver su panel aquí: tareas, gantt, chat, documentos y notas. Las carpetas también están en el menú lateral, dentro de Proyectos.</p>
      {/* margen a la derecha: el abanico de acciones sale por la esquina superior derecha */}
      <div className="grid grid-flow-row-dense grid-cols-1 gap-x-4 gap-y-3 pr-12 md:grid-cols-2 xl:grid-cols-3">
        {state.projects.map((p) => (
          <Fragment key={p.id}>
            <div className="-my-[52px]">
              <ProjectNode project={p} state={state} today={today} expanded={open === p.id} onToggle={() => setOpen(open === p.id ? null : p.id)} />
            </div>
            {open === p.id && (
              // el panel de la carpeta a lo ancho, justo debajo de su fila
              <div className="col-span-full pb-space-lg">
                <ProjectDashboard state={state} project={p} today={today} />
              </div>
            )}
          </Fragment>
        ))}
        <div className="flex">
          <button
            type="button"
            onClick={() => actions.openDrawer({ type: 'project' })}
            className="flex h-full min-h-24 w-full flex-col items-center justify-center gap-1 rounded-[20px] border border-dashed border-outline-variant text-outline transition-colors hover:border-outline hover:text-on-surface"
          >
            <Plus size={22} aria-hidden="true" />
            <span className="text-label-md">Nueva carpeta</span>
          </button>
        </div>
      </div>
    </div>
  );
}
