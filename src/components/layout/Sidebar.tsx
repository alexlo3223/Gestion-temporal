import { ChevronRight, Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { actions } from '../../actions';
import { navigate } from '../../hooks/useHashRoute';
import { routesIn } from '../../routes';
import { compareByPriority, openTasks } from '../../store/selectors';
import type { AppState, UiState } from '../../types';
import { ColorDot } from '../ui/primitives';
import { openProjectTasks } from '../ui/ProjectNode';

export function Sidebar({ route, state, ui }: { route: string; state: AppState; ui: UiState }) {
  const { name } = state.settings;
  /* carpetas desplegadas: es solo de esta vista, no se guarda */
  const [expanded, setExpanded] = useState<string[]>([]);
  const link = ([key, { title, Icon }]: ReturnType<typeof routesIn>[number]) => (
    <li key={key}>
      <a href={`#${key}`} className={`nav-link ${route === key ? 'active' : ''}`} aria-current={route === key ? 'page' : undefined}>
        <Icon size={18} aria-hidden="true" />
        {title}
      </a>
    </li>
  );

  return (
    <aside
      id="sidebar"
      aria-label="Navegación principal"
      className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col justify-between bg-surface-container-lowest transition-transform lg:translate-x-0 ${ui.menuOpen ? 'translate-x-0' : '-translate-x-full'}`}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="flex items-center gap-space-sm p-space-md">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-container font-semibold text-white" aria-hidden="true">
            {name.charAt(0).toUpperCase()}
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-label-md">{name}</span>
            <span className="truncate text-label-sm text-outline">Gestor tiempo · Personal</span>
          </div>
        </div>

        <div className="px-space-md py-space-xs">
          <label className="flex items-center gap-space-xs rounded-lg bg-surface-container-low px-space-sm py-1.5 text-outline focus-within:ring-1 focus-within:ring-primary">
            <Search size={16} aria-hidden="true" />
            <span className="sr-only">Buscar tareas</span>
            <input
              id="search"
              type="search"
              value={ui.query}
              onChange={(e) => {
                actions.search(e.target.value);
                if (route !== 'tasks') navigate('tasks');
              }}
              placeholder="Buscar tareas…"
              autoComplete="off"
              className="w-full bg-transparent text-body-sm text-on-surface outline-none placeholder:text-outline"
            />
            <kbd className="rounded bg-surface-container px-space-xs py-0.5 font-mono text-label-caps text-on-surface-variant">/</kbd>
          </label>
        </div>

        <nav className="px-space-md pt-space-md" aria-labelledby="nav-essentials">
          <h2 id="nav-essentials" className="caps px-space-sm">
            Esenciales
          </h2>
          <ul className="mt-space-xs flex flex-col gap-0.5">{routesIn('main').map(link)}</ul>
        </nav>

        <section className="px-space-md pt-space-lg" aria-labelledby="nav-projects">
          <div className="flex items-center justify-between px-space-sm">
            <h2 id="nav-projects" className="caps">
              Carpetas
            </h2>
            <button type="button" onClick={() => actions.openDrawer({ type: 'project' })} className="icon-btn p-0.5" aria-label="Nueva carpeta">
              <Plus size={16} aria-hidden="true" />
            </button>
          </div>
          <ul className="mt-space-xs flex flex-col gap-0.5">
            {state.projects.map((p) => {
              const active = route === 'tasks' && ui.projects.length === 1 && ui.projects[0] === p.id;
              const tasks = openTasks(state)
                .filter((t) => t.projectId === p.id)
                .sort(compareByPriority);
              const isExpanded = expanded.includes(p.id);
              return (
                <li key={p.id}>
                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={() => setExpanded((ids) => (isExpanded ? ids.filter((id) => id !== p.id) : [...ids, p.id]))}
                      disabled={tasks.length === 0}
                      className="icon-btn p-0.5 disabled:invisible"
                      aria-expanded={isExpanded}
                      aria-controls={`tree-${p.id}`}
                      aria-label={`${isExpanded ? 'Ocultar' : 'Mostrar'} tareas de ${p.name}`}
                    >
                      <ChevronRight size={14} className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`} aria-hidden="true" />
                    </button>
                    <button type="button" onClick={() => openProjectTasks(p.id)} className={`nav-link min-w-0 flex-1 ${active ? 'active' : ''}`} aria-current={active || undefined}>
                      <ColorDot color={p.color} />
                      <span className="truncate">{p.name}</span>
                      <span className="ml-auto font-mono text-[10px] text-outline" aria-label={`${tasks.length} tareas abiertas`}>
                        {tasks.length}
                      </span>
                    </button>
                  </div>
                  {isExpanded && (
                    <ul id={`tree-${p.id}`} className="ml-[11px] flex flex-col border-l border-surface-container-high pl-space-sm">
                      {tasks.map((t) => (
                        <li key={t.id}>
                          <button
                            type="button"
                            onClick={() => actions.openDrawer({ type: 'task', taskId: t.id })}
                            className="w-full truncate rounded-md px-space-sm py-1 text-left text-body-sm text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                            title={t.title}
                          >
                            {t.title}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <nav className="flex flex-col gap-0.5 p-space-md" aria-label="Configuración">
        <ul className="flex flex-col gap-0.5">{routesIn('footer').map(link)}</ul>
        <p className="flex items-center gap-space-xs px-space-sm pt-space-sm text-label-sm text-outline">
          <span className="size-1.5 animate-pulse rounded-full bg-primary-container" aria-hidden="true" />
          Guardado en este navegador
        </p>
      </nav>
    </aside>
  );
}
