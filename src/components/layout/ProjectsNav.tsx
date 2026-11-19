import { ChartGantt, ChevronRight, FileText, Folder, LayoutDashboard, ListChecks, MessageSquare, NotebookPen, Plus, type LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { actions } from '../../actions';
import { PROJECT_SECTIONS } from '../../constants';
import { docsOf, openTasks } from '../../store/selectors';
import type { AppState, ProjectSection } from '../../types';
import { ColorDot } from '../ui/primitives';

const ICONS: Record<ProjectSection, LucideIcon> = { resumen: LayoutDashboard, tareas: ListChecks, gantt: ChartGantt, chat: MessageSquare, documentos: FileText, notas: NotebookPen };
const SECTIONS = Object.keys(PROJECT_SECTIONS) as ProjectSection[];
const STORAGE = 'gestor-tiempo:projects-nav';

interface Open {
  root: boolean;
  projects: string[];
}

function readOpen(): Open {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE) ?? 'null') as Partial<Open> | null;
    return { root: saved?.root ?? false, projects: Array.isArray(saved?.projects) ? saved.projects.filter((id) => typeof id === 'string') : [] };
  } catch {
    return { root: false, projects: [] }; // almacenamiento bloqueado o dato corrupto
  }
}

/**
 * «Proyectos» del menú lateral como desplegable: cada carpeta se abre en sus secciones (Resumen, Tareas, Gantt, Chat,
 * Documentos y Notas) y estas enlazan a `#projects/<carpeta>/<sección>`. Lo abierto se recuerda.
 */
export function ProjectsNav({ state, route, params }: { state: AppState; route: string; params: string[] }) {
  const [open, setOpen] = useState<Open>(readOpen);
  const inProjects = route === 'projects';
  const [currentId, currentSection = 'resumen', currentDoc] = inProjects ? params : [];

  const update = (next: Open) => {
    setOpen(next);
    try {
      localStorage.setItem(STORAGE, JSON.stringify(next));
    } catch {
      /* solo es una preferencia */
    }
  };

  /* al entrar en una carpeta (desde una tarjeta, un enlace…) el menú la muestra abierta */
  useEffect(() => {
    if (!inProjects) return;
    setOpen((prev) => (prev.root && (!currentId || prev.projects.includes(currentId)) ? prev : { root: true, projects: currentId && !prev.projects.includes(currentId) ? [...prev.projects, currentId] : prev.projects }));
  }, [inProjects, currentId]);

  const toggleProject = (id: string) => update({ ...open, projects: open.projects.includes(id) ? open.projects.filter((p) => p !== id) : [...open.projects, id] });
  const sub = 'nav-link !py-1 !text-body-sm';

  return (
    <li>
      <div className="flex items-center">
        <a href="#projects" className={`nav-link min-w-0 flex-1 ${inProjects && !currentId ? 'active' : ''}`} aria-current={inProjects && !currentId ? 'page' : undefined}>
          <Folder size={18} aria-hidden="true" />
          Proyectos
        </a>
        <button type="button" onClick={() => actions.openDrawer({ type: 'project' })} className="icon-btn p-0.5" aria-label="Nueva carpeta" title="Nueva carpeta">
          <Plus size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => update({ ...open, root: !open.root })}
          className="icon-btn p-0.5"
          aria-expanded={open.root}
          aria-controls="projects-tree"
          aria-label={`${open.root ? 'Ocultar' : 'Mostrar'} las carpetas de Proyectos`}
        >
          <ChevronRight size={16} className={`transition-transform ${open.root ? 'rotate-90' : ''}`} aria-hidden="true" />
        </button>
      </div>

      <div className="tree-collapse" data-open={open.root} inert={!open.root}>
        <ul id="projects-tree" className="ml-[19px] flex flex-col border-l border-surface-container-high pl-space-xs">
          {state.projects.length === 0 && <li className="px-space-sm py-1 text-label-sm text-outline">Aún no hay carpetas</li>}
          {state.projects.map((p) => {
            const expanded = open.projects.includes(p.id);
            const here = inProjects && currentId === p.id;
            const openCount = openTasks(state).filter((t) => t.projectId === p.id).length;
            return (
              <li key={p.id}>
                <div className="flex items-center">
                  <button type="button" onClick={() => toggleProject(p.id)} className="icon-btn p-0.5" aria-expanded={expanded} aria-controls={`projects-tree-${p.id}`} aria-label={`${expanded ? 'Ocultar' : 'Mostrar'} las secciones de ${p.name}`}>
                    <ChevronRight size={14} className={`transition-transform ${expanded ? 'rotate-90' : ''}`} aria-hidden="true" />
                  </button>
                  <a href={`#projects/${encodeURIComponent(p.id)}`} className={`${sub} min-w-0 flex-1 ${here && currentSection === 'resumen' && !currentDoc ? 'active' : ''}`} aria-current={here && currentSection === 'resumen' ? 'page' : undefined}>
                    <ColorDot color={p.color} />
                    <span className="truncate">{p.name}</span>
                    <span className="ml-auto font-mono text-[10px] text-outline" aria-label={`${openCount} tareas abiertas`}>
                      {openCount}
                    </span>
                  </a>
                </div>
                <div className="tree-collapse" data-open={expanded} inert={!expanded}>
                  <ul id={`projects-tree-${p.id}`} className="ml-[11px] flex flex-col border-l border-surface-container-high pl-space-xs">
                    {SECTIONS.map((section) => {
                      const Icon = ICONS[section];
                      const active = here && currentSection === section && !currentDoc;
                      const files = section === 'documentos' || section === 'notas' ? docsOf(state, p.id, section === 'notas' ? 'nota' : 'documento') : [];
                      return (
                        <li key={section}>
                          <a href={`#projects/${encodeURIComponent(p.id)}/${section}`} className={`${sub} ${active ? 'active' : ''}`} aria-current={active ? 'page' : undefined}>
                            <Icon size={14} aria-hidden="true" />
                            {PROJECT_SECTIONS[section]}
                            {files.length > 0 && <span className="ml-auto font-mono text-[10px] text-outline">{files.length}</span>}
                          </a>
                          {files.length > 0 && (
                            <ul className="ml-[9px] flex flex-col border-l border-surface-container-high pl-space-xs">
                              {files.map((d) => {
                                const activeDoc = here && currentSection === section && currentDoc === d.id;
                                return (
                                  <li key={d.id}>
                                    <a
                                      href={`#projects/${encodeURIComponent(p.id)}/${section}/${encodeURIComponent(d.id)}`}
                                      className={`block truncate rounded-md px-space-sm py-1 text-label-sm hover:bg-surface-container-high hover:text-on-surface ${activeDoc ? 'bg-surface-bright font-semibold text-on-surface' : 'text-on-surface-variant'}`}
                                      aria-current={activeDoc ? 'page' : undefined}
                                      title={d.title}
                                    >
                                      {d.title}
                                    </a>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </li>
  );
}
