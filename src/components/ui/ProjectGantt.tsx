import { es } from 'date-fns/locale';
import { ChartGantt } from 'lucide-react';
import { useMemo } from 'react';
import { actions } from '../../actions';
import { buildGantt, rangeToISO } from '../../lib/ganttAdapter';
import type { AppState } from '../../types';
import { EmptyState } from './primitives';
import { Gantt } from '@/components/reui/gantt/gantt';
import { GanttNav } from '@/components/reui/gantt/gantt-nav';
import type { GanttI18nOverrides } from '@/components/reui/gantt/gantt-i18n';
import { GanttView } from '@/components/reui/gantt/gantt-view';

const I18N: GanttI18nOverrides = {
  labels: {
    today: 'Hoy',
    previous: 'Anterior',
    next: 'Siguiente',
    addEvent: 'Añadir tarea',
    addTask: 'Añadir tarea',
    allDay: 'Todo el día',
    loading: 'Cargando tareas',
    event: 'tarea',
    events: (count: number) => (count === 1 ? '1 tarea' : `${count} tareas`),
    week: (n: number) => `S${n}`,
    resources: 'Tareas',
    goToDate: 'Ir a una fecha',
    scheduleHint: 'Sin acción',
    scheduleHintDrag: 'Sin acción',
    reorder: 'Reordenar',
    selectView: 'Escala del cronograma',
    zoomIn: 'Acercar',
    zoomOut: 'Alejar',
    resizePanel: 'Cambiar el ancho del panel',
    jumpToBar: (title: string) => `Ir a «${title}»`,
    progress: (percent: number) => `${percent}% completado`,
    durationDays: (days: number) => (days === 1 ? '1 día' : `${days} días`),
    continues: 'continúa fuera de la vista',
    milestone: 'hito',
    scales: { day: 'Día', week: 'Semana', month: 'Mes', quarter: 'Trimestre', year: 'Año' },
  },
  formats: { dayTitle: "EEEE, d 'de' MMMM 'de' yyyy", timeGutter: 'HH:mm', eventTime: 'HH:mm' },
};

/**
 * Cronograma de tareas con el Gantt de ReUI: filas por tarea agrupadas por fase (y por carpeta en la vista global).
 * Arrastrar una barra o sus bordes cambia el inicio y la fecha límite de la tarea; pulsarla abre su formulario.
 */
export function ProjectGantt({ state, projectId }: { state: AppState; projectId?: string }) {
  const { resources, events, undated } = useMemo(() => buildGantt(state, projectId), [state, projectId]);
  const title = projectId ? 'Gantt' : 'Cronograma';

  return (
    <section className="card flex flex-col gap-space-md" aria-label={title}>
      <div className="flex flex-wrap items-center justify-between gap-space-sm">
        <h2 className="flex items-center gap-space-xs text-headline-sm font-semibold">
          <ChartGantt size={18} className="text-primary" aria-hidden="true" />
          {title}
        </h2>
        <p className="text-label-sm text-outline">
          Arrastra una barra para cambiar sus fechas · varias tareas por fila
          {undated ? ` · ${undated} ${undated === 1 ? 'tarea sin fecha límite no sale' : 'tareas sin fecha límite no salen'}` : ''}
        </p>
      </div>
      {events.length === 0 ? (
        <EmptyState>No hay tareas con fecha límite. Ponle fecha a una tarea para verla aquí.</EmptyState>
      ) : (
        <Gantt
          events={events}
          resources={resources}
          defaultScale="month"
          scheduleMode="multiple"
          treePanel={{ width: 280 }}
          locale={es}
          weekStartsOn={1}
          i18n={I18N}
          onEventClick={(occurrence) => actions.openDrawer({ type: 'task', taskId: occurrence.eventId })}
          onEventUpdate={(update) => {
            const { start, due } = rangeToISO(update.start, update.end);
            actions.setTaskDates(update.event.id, { start, due });
          }}
          className="h-[720px] w-full"
        >
          <GanttNav />
          <GanttView />
        </Gantt>
      )}
    </section>
  );
}
