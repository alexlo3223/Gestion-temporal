import { Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { actions } from '../../actions';
import { navigate } from '../../hooks/useHashRoute';
import { routesIn } from '../../routes';
import type { AppState, UiState } from '../../types';
import { ProjectsNav } from './ProjectsNav';

export function Sidebar({ route, params = [], state, ui }: { route: string; params?: string[]; state: AppState; ui: UiState }) {
  const { name } = state.settings;
  /* la búsqueda filtra el tablero 250 ms después de dejar de teclear, no con cada letra */
  const [query, setQuery] = useState(ui.query);
  const searchTimer = useRef<number | undefined>(undefined);
  useEffect(() => setQuery(ui.query), [ui.query]); // p. ej. al quitar la búsqueda desde el tablero
  useEffect(() => () => window.clearTimeout(searchTimer.current), []);
  const link = ([key, { title, Icon }]: ReturnType<typeof routesIn>[number]) =>
    key === 'projects' ? (
      <ProjectsNav key={key} state={state} route={route} params={params} />
    ) : (
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
      <div className="flex min-h-0 flex-1 flex-col scroll-contain overflow-y-auto">
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
              value={query}
              onChange={(e) => {
                const value = e.target.value;
                setQuery(value);
                window.clearTimeout(searchTimer.current);
                searchTimer.current = window.setTimeout(() => actions.search(value), 250);
                if (route !== 'tasks') navigate('tasks');
              }}
              enterKeyHint="search"
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
