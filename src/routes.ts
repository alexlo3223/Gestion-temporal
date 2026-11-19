import { CalendarDays, ChartColumn, Folder, House, ListChecks, Rocket, Settings, type LucideIcon } from 'lucide-react';
import { type ComponentType, lazy } from 'react';
import type { AppState, UiState } from './types';

export interface ViewProps {
  state: AppState;
  ui: UiState;
}

export interface Route {
  title: string;
  Icon: LucideIcon;
  View: ComponentType<ViewProps>;
  /** 'main': navegación principal (menú y dock móvil); 'footer': pie del menú. */
  group: 'main' | 'footer';
}

/* cada vista va en su propio fragmento: solo se descarga la página que se abre */
const view = <K extends string>(load: () => Promise<Record<K, ComponentType<ViewProps>>>, name: K) =>
  lazy(() => load().then((module) => ({ default: module[name] })));

export const ROUTES: Record<string, Route> = {
  home: { title: 'Inicio', Icon: House, View: view(() => import('./views/HomeView'), 'HomeView'), group: 'main' },
  tasks: { title: 'Tareas', Icon: ListChecks, View: view(() => import('./views/TasksView'), 'TasksView'), group: 'main' },
  calendar: { title: 'Calendario', Icon: CalendarDays, View: view(() => import('./views/CalendarView'), 'CalendarView'), group: 'main' },
  projects: { title: 'Proyectos', Icon: Folder, View: view(() => import('./views/ProjectsView'), 'ProjectsView'), group: 'main' },
  analytics: { title: 'Analíticas', Icon: ChartColumn, View: view(() => import('./views/AnalyticsView'), 'AnalyticsView'), group: 'main' },
  settings: { title: 'Ajustes', Icon: Settings, View: view(() => import('./views/SettingsView'), 'SettingsView'), group: 'footer' },
  releases: { title: 'Releases', Icon: Rocket, View: view(() => import('./views/ReleasesView'), 'ReleasesView'), group: 'footer' },
};

export const DEFAULT_ROUTE = 'home';

export const resolveRoute = (hash: string) => (Object.hasOwn(ROUTES, hash) ? hash : DEFAULT_ROUTE);

export const routesIn = (group: Route['group']) => Object.entries(ROUTES).filter(([, r]) => r.group === group);
