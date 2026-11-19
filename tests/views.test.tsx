import type { ComponentType } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DEFAULT_UI, PROJECT_SECTIONS } from '../src/constants';
import { ROUTES, type ViewProps } from '../src/routes';
import { createSampleData } from '../src/store/sample';
import { startTimer } from '../src/store/timer';
import { AnalyticsView } from '../src/views/AnalyticsView';
import { CalendarView } from '../src/views/CalendarView';
import { ProjectDashboard } from '../src/components/ui/ProjectDashboard';
import { Sidebar } from '../src/components/layout/Sidebar';
import type { ProjectSection } from '../src/types';
import { ParticipantForm } from '../src/components/forms/ParticipantForm';
import LatticeLoader from '../src/components/ui/LatticeLoader';
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

describe('proyectos', () => {
  const state = createSampleData({ now: new Date(NOW), createId });
  const clean = (html: string) => html.replace(/<[^>]+>/g, ' ');

  it('cada sección del panel se pinta, con su contenido', () => {
    const project = state.projects.find((p) => p.id === 'app')!;
    for (const section of Object.keys(PROJECT_SECTIONS) as ProjectSection[]) {
      const html = renderToString(<ProjectDashboard state={state} project={project} section={section} today="2026-11-17" />);
      expect(clean(html)).not.toMatch(/undefined|NaN|\[object Object\]/);
      expect(html).toContain(project.name);
    }
    const chat = clean(renderToString(<ProjectDashboard state={state} project={project} section="chat" today="2026-11-17" />));
    expect(chat).toContain('Laura');
    expect(chat).toContain('wireframes del onboarding');
    expect(clean(renderToString(<ProjectDashboard state={state} project={project} section="notas" today="2026-11-17" />))).toContain('Decisiones de diseño');
  });

  it('el menú lateral trae Proyectos como desplegable y ya no tiene la sección Carpetas', () => {
    const html = renderToString(<Sidebar route="projects" params={[]} state={state} ui={{ ...DEFAULT_UI }} />);
    expect(html).toContain('Proyectos');
    expect(html).toContain('aria-controls="projects-tree"');
    expect(html).not.toContain('nav-projects');
    expect(html).not.toContain('>Carpetas<');
  });

  it('las rutas de carpeta se pintan: panel, sección y carpeta que no existe', () => {
    const View = VIEWS.projects;
    const ui = { ...DEFAULT_UI };
    expect(clean(renderToString(<View state={state} ui={ui} params={['app', 'gantt']} />))).toContain('Gantt');
    expect(clean(renderToString(<View state={state} ui={ui} params={['app', 'documentos', 'sample-doc-1']} />))).toContain('Requisitos de la app');
    expect(renderToString(<View state={state} ui={ui} params={['nope']} />)).toContain('Nueva carpeta'); // vuelve a las tarjetas
  });
});

describe('componentes añadidos', () => {
  it('el formulario de participante se pinta con su campo y sus botones', () => {
    const html = renderToString(<ParticipantForm projectId="app" onDone={() => {}} />);
    expect(html).toContain('name="name"');
    expect(html).toContain('Añadir');
    expect(html).toContain('Cancelar');
  });

  it('LatticeLoader pinta su cuadrícula, el estado y el aviso para lectores de pantalla', () => {
    const working = renderToString(<LatticeLoader label="Cargando" />);
    expect(working).toContain('data-status="working"');
    expect(working.match(/lattice-loader__cell/g)).toHaveLength(18); // 9 de animación + 9 de marca
    expect(working).toContain('Cargando, en curso');
    const failed = renderToString(<LatticeLoader status="error" grid={4} pattern="snake" showTimer={false} />);
    expect(failed).toContain('data-status="error"');
    expect(failed.match(/lattice-loader__cell/g)).toHaveLength(32);
    expect(failed).not.toContain('lattice-loader__timer');
  });
});

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

  it('el calendario se pinta con sus eventos y la barra de navegación', () => {
    const state = createSampleData({ now: new Date(NOW), createId });
    const html = renderToString(<CalendarView state={state} ui={{ ...DEFAULT_UI }} />);
    expect(html.replace(/<[^>]+>/g, ' ')).not.toMatch(/undefined|NaN|\[object Object\]/);
    expect(html).toContain('Hoy');
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
