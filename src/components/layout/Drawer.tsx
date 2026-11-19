import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { actions } from '../../actions';
import { useLiquidGlass } from '../../hooks/useLiquidGlass';
import { shake } from '../../lib/shake';
import { findEvent, findProject, findTask } from '../../store/selectors';
import type { AppState, DrawerState } from '../../types';
import { EventForm } from '../forms/EventForm';
import type { FieldError } from '../forms/FormParts';
import { ProjectForm } from '../forms/ProjectForm';
import { TaskForm } from '../forms/TaskForm';

function DrawerContent({ drawer, state, fieldError }: { drawer: NonNullable<DrawerState>; state: AppState; fieldError: FieldError }) {
  switch (drawer.type) {
    case 'task':
      return <TaskForm state={state} task={findTask(state, drawer.taskId)} defaults={drawer.defaults} fieldError={fieldError} />;
    case 'event':
      return <EventForm state={state} event={findEvent(state, drawer.eventId)} defaults={drawer.defaults} fieldError={fieldError} />;
    case 'project':
      return <ProjectForm project={findProject(state, drawer.projectId)} fieldError={fieldError} />;
  }
}

/** Panel lateral modal con el formulario activo. Devuelve el foco a donde estaba al cerrarse. */
export function Drawer({ drawer, state, fieldError }: { drawer: DrawerState; state: AppState; fieldError: FieldError }) {
  const returnFocus = useRef<HTMLElement | null>(null);
  const isOpen = drawer !== null;
  const dialog = useRef<HTMLDivElement | null>(null);

  /* un error de validación sacude el campo que falló (o el panel si no se sabe cuál); el objeto es nuevo en cada intento */
  useEffect(() => {
    if (!fieldError) return;
    const field = dialog.current?.querySelector('.lbi[data-error="true"], [aria-invalid="true"]');
    shake(field ?? dialog.current);
  }, [fieldError]);

  useEffect(() => {
    if (!isOpen) return;
    returnFocus.current = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') actions.closeDrawer();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (returnFocus.current?.isConnected) returnFocus.current.focus();
    };
  }, [isOpen]);

  /* la clave cambia con lo que se edita, así el formulario empieza limpio cada vez */
  const key = drawer ? `${drawer.type}-${'taskId' in drawer ? drawer.taskId : 'eventId' in drawer ? drawer.eventId : 'projectId' in drawer ? drawer.projectId : ''}` : '';

  useLiquidGlass(dialog, undefined, isOpen, key);

  return (
    <AnimatePresence>
      {drawer && (
        <>
          <motion.div
            key="scrim"
            className="fixed inset-0 z-[45] bg-black/60 backdrop-blur-[3px]"
            onClick={actions.closeDrawer}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
          <motion.div
            key={key}
            ref={dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="drawer-title"
            className="fixed inset-y-0 right-0 z-50 w-full scroll-contain overflow-y-auto liquid-glass liquid-glass--modal p-space-lg sm:w-96"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 420, damping: 40 }}
          >
            <DrawerContent drawer={drawer} state={state} fieldError={fieldError} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
