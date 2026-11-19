import { FolderPlus, Plus } from 'lucide-react';
import { Fragment, useState } from 'react';
import { actions } from '../actions';
import { PageHeader } from '../components/ui/primitives';
import { ProjectNode } from '../components/ui/ProjectNode';
import { ProjectTimeline } from '../components/ui/ProjectTimeline';
import { TaskRow } from '../components/ui/TaskRow';
import { compareByPriority } from '../store/selectors';
import { todayISO } from '../lib/dates';
import type { ViewProps } from '../routes';

export function ProjectsView({ state }: ViewProps) {
  const today = todayISO();
  const [open, setOpen] = useState<string | null>(null);
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
      <p className="text-body-sm text-outline">Pulsa el nombre para ir a sus tareas, o «Abrir carpeta» para ver su contenido aquí. Pasa el ratón por encima para las acciones rápidas.</p>
      {/* margen a la derecha: el abanico de acciones sale por la esquina superior derecha */}
      <div className="grid grid-flow-row-dense grid-cols-1 gap-x-14 pr-12 md:grid-cols-2 xl:grid-cols-3">
        {state.projects.map((p) => {
          const tasks = state.tasks.filter((t) => t.projectId === p.id).sort((a, b) => Number(a.status === 'done') - Number(b.status === 'done') || compareByPriority(a, b));
          return (
            <Fragment key={p.id}>
              <ProjectNode project={p} state={state} today={today} expanded={open === p.id} onToggle={() => setOpen(open === p.id ? null : p.id)} />
              {open === p.id && (
                // contenido de la carpeta a lo ancho, justo debajo de su fila
                <div className="col-span-full flex flex-col gap-space-md pb-space-lg">
                  <section className="card flex flex-col gap-0.5" aria-label={`Tareas de ${p.name}`}>
                    {tasks.length ? (
                      tasks.map((t) => <TaskRow key={t.id} task={t} state={state} today={today} />)
                    ) : (
                      <p className="p-space-md text-center text-body-sm text-outline">Esta carpeta aún no tiene tareas.</p>
                    )}
                  </section>
                  <ProjectTimeline state={state} now={new Date()} projectId={p.id} />
                </div>
              )}
            </Fragment>
          );
        })}
        <div className="py-[52px]">
          <button
            type="button"
            onClick={() => actions.openDrawer({ type: 'project' })}
            className="flex h-full min-h-40 w-full flex-col items-center justify-center gap-1 rounded-[20px] border border-dashed border-outline-variant text-outline transition-colors hover:border-outline hover:text-on-surface"
          >
            <Plus size={22} aria-hidden="true" />
            <span className="text-label-md">Nueva carpeta</span>
          </button>
        </div>
      </div>
    </div>
  );
}
