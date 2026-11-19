import { Suspense, useEffect, useRef } from 'react';
import { actions } from './actions';
import { GlassDock } from './components/blocks/GlassDock';
import { ToastStack } from './components/blocks/ToastStack';
import { Drawer } from './components/layout/Drawer';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { navigate, useHashRoute } from './hooks/useHashRoute';
import { useStore } from './hooks/useStore';
import { ROUTES, resolveRoute, routesIn } from './routes';

const DOCK_ITEMS = routesIn('main').map(([key, { title, Icon }]) => ({ key, label: title, Icon }));
const EDITABLE = 'input, select, textarea, [contenteditable="true"]';

export function App() {
  const route = resolveRoute(useHashRoute());
  const { state, ui } = useStore();
  const main = useRef<HTMLElement | null>(null);
  const { title, View } = ROUTES[route];

  /* cierra el pomodoro cuando llega a cero, aunque no se esté viendo el tablero */
  useEffect(() => {
    const id = window.setInterval(() => actions.completePomodoroIfDue(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  /* al cambiar de página: título, menú cerrado, arriba del todo y foco en el contenido */
  useEffect(() => {
    document.title = `${title} · Gestor tiempo`;
    actions.setMenu(false);
    window.scrollTo(0, 0);
    main.current?.focus({ preventScroll: true });
  }, [title]);

  /* atajos: "/" busca, Escape cierra el menú móvil */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') actions.setMenu(false);
      if (e.key === '/' && !(document.activeElement as Element | null)?.matches(EDITABLE)) {
        e.preventDefault();
        document.getElementById('search')?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      {/* con un formulario abierto, el resto de la app queda inerte (modal de verdad) */}
      <div inert={ui.drawer !== null}>
        <a
          href="#view"
          onClick={(e) => {
            e.preventDefault();
            main.current?.focus();
          }}
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[70] focus:rounded-lg focus:bg-primary focus:px-3 focus:py-2 focus:text-on-primary"
        >
          Saltar al contenido
        </a>
        <Sidebar route={route} state={state} ui={ui} />
        {ui.menuOpen && <div className="fixed inset-0 z-[35] bg-black/60 lg:hidden" onClick={() => actions.setMenu(false)} aria-hidden="true" />}

        <div className="flex min-h-screen flex-col lg:pl-64">
          <Header title={title} state={state} ui={ui} />
          <main id="view" ref={main} tabIndex={-1} className="mx-auto w-full max-w-[1560px] flex-1 p-space-md pb-28 outline-none lg:p-space-lg">
            <Suspense fallback={<p className="p-space-lg text-body-sm text-outline">Cargando…</p>}>
              <View state={state} ui={ui} />
            </Suspense>
          </main>
        </div>

        <div className="fixed inset-x-0 bottom-3 z-30 flex justify-center lg:hidden">
          <GlassDock items={DOCK_ITEMS} active={route} onSelect={navigate} />
        </div>
      </div>

      <Drawer drawer={ui.drawer} state={state} fieldError={ui.fieldError} />
      <ToastStack />
    </>
  );
}
