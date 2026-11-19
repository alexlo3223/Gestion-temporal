import type { ComponentType } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DEFAULT_UI } from '../src/constants';
import { ROUTES, type ViewProps } from '../src/routes';
import { createSampleData } from '../src/store/sample';
import { startTimer } from '../src/store/timer';
import { AnalyticsView } from '../src/views/AnalyticsView';
import { CalendarView } from '../src/views/CalendarView';
import { HomeView } from '../src/views/HomeView';
import { ProjectsView } from '../src/views/ProjectsView';
import { ReleasesView } from '../src/views/ReleasesView';
import { SettingsView } from '../src/views/SettingsView';
import { TasksView } from '../src/views/TasksView';
import { NOW, createId, ctx } from './fixtures';

// Las rutas cargan las vistas en diferido (lazy); aquí se importan directamente.
const VIEWS: Record<string, ComponentType<ViewProps>> = {
  home: HomeView,
  tasks: TasksView,
  calendar: CalendarView,
  projects: ProjectsView,
  analytics: AnalyticsView,
  settings: SettingsView,
  releases: ReleasesView,
};

const render = (route: string, state = createSampleData({ now: new Date(NOW), createId })) => {
  const View = VIEWS[route];
  return renderToString(<View state={state} ui={{ ...DEFAULT_UI }} />);
};

describe('vistas', () => {
  it('cada ruta tiene su vista', () => {
    expect(Object.keys(VIEWS).sort()).toEqual(Object.keys(ROUTES).sort());
  });

  for (const route of Object.keys(VIEWS)) {
    it(`"${route}" se pinta con los datos de muestra`, () => {
      const html = render(route);
      expect(html.match(/<h1\b/g)).toHaveLength(1);
      // texto visible sin valores rotos (los atributos internos de React no cuentan)
      const text = html.replace(/<[^>]+>/g, ' ');
      expect(text).not.toMatch(/undefined|NaN|\[object Object\]/);
    });
  }

  it('el calendario se pinta en vista de mes y por carpeta', () => {
    const state = createSampleData({ now: new Date(NOW), createId });
    for (const calendarView of ['month', 'projects'] as const) {
      const html = renderToString(<CalendarView state={state} ui={{ ...DEFAULT_UI, calendarView }} />);
      expect(html.replace(/<[^>]+>/g, ' ')).not.toMatch(/undefined|NaN|\[object Object\]/);
    }
    const byProject = renderToString(<CalendarView state={state} ui={{ ...DEFAULT_UI, calendarView: 'projects' }} />);
    for (const p of state.projects) expect(byProject).toContain(p.name);
  });

  it('el tablero muestra el pomodoro de la tarea en curso', () => {
    const state = createSampleData({ now: new Date(NOW), createId });
    startTimer(state, state.tasks[0].id, ctx());
    expect(render('tasks', state)).toContain('Sesión foco');
  });

  it('escapa el texto introducido por el usuario', () => {
    const state = createSampleData({ now: new Date(NOW), createId });
    state.tasks[0].title = '<script>alert(1)</script>';
    state.projects[0].name = '"><img src=x onerror=alert(1)>';
    for (const route of Object.keys(VIEWS)) {
      const html = render(route, state);
      expect(html).not.toContain('<script>alert(1)</script>');
      expect(html).not.toContain('<img src=x');
    }
  });
});
