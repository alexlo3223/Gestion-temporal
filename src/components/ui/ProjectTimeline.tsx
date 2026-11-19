import { ChartGantt } from 'lucide-react';
import { actions } from '../../actions';
import { addDays, daysBetween, startOfWeek, toISODate } from '../../lib/dates';
import { formatDate, formatDuration } from '../../lib/format';
import { ganttBars } from '../../store/selectors';
import type { AppState } from '../../types';
import { ColorDot, EmptyState } from './primitives';

const DAYS = 28;
const LABEL_W = 180;

/**
 * Cronograma de 4 semanas desde el lunes actual: una fila por tarea abierta con fecha,
 * agrupadas por carpeta. La barra acaba en la fecha límite y mide la estimación en jornadas.
 */
export function ProjectTimeline({ state, now, projectId }: { state: AppState; now: Date; projectId?: string }) {
  const from = toISODate(startOfWeek(now));
  const days = Array.from({ length: DAYS }, (_, i) => toISODate(addDays(startOfWeek(now), i)));
  const todayCol = daysBetween(from, toISODate(now));
  const bars = ganttBars(state, from, DAYS);
  const groups = state.projects.filter((p) => !projectId || p.id === projectId).map((p) => ({ project: p, bars: bars.filter((b) => b.task.projectId === p.id) })).filter((g) => g.bars.length);
  const columns = `${LABEL_W}px repeat(${DAYS},minmax(22px,1fr))`;
  /* la línea de hoy cruza todas las filas: absoluta, en el centro de su columna (todas miden igual) */
  const todayLine = { left: `calc(${LABEL_W}px + (100% - ${LABEL_W}px) * ${(todayCol + 0.5) / DAYS})` };

  return (
    <section className="card flex flex-col gap-space-md p-space-lg" aria-labelledby={`timeline-title-${projectId ?? "all"}`}>
      <div className="flex flex-wrap items-center justify-between gap-space-sm">
        <h2 id={`timeline-title-${projectId ?? "all"}`} className="flex items-center gap-space-xs text-headline-sm font-semibold">
          <ChartGantt size={18} className="text-primary" aria-hidden="true" />
          Cronograma
        </h2>
        <p className="text-label-sm text-outline">Cada barra acaba en la fecha límite y dura su estimación en jornadas · ◆ sin estimación</p>
      </div>
      {groups.length === 0 ? (
        <EmptyState>No hay tareas abiertas con fecha en las próximas 4 semanas.</EmptyState>
      ) : (
        <div className="overflow-x-auto">
          <div className="relative grid min-w-[820px] items-center gap-y-1" style={{ gridTemplateColumns: columns }}>
            <span className="caps" style={{ gridColumn: 1 }}>
              Tarea
            </span>
            {days.map((d, i) => (
              <span key={d} className={`text-center text-label-caps tabular-nums ${i === todayCol ? 'font-semibold text-primary' : 'text-outline'}`} title={formatDate(d, { weekday: 'long', day: 'numeric', month: 'long' })}>
                {i % 7 === 0 || i === todayCol ? formatDate(d, { day: 'numeric', month: 'short' }) : formatDate(d, { day: 'numeric' })}
              </span>
            ))}
            {todayCol >= 0 && todayCol < DAYS && <span className="pointer-events-none absolute inset-y-0 w-px bg-primary/60" style={todayLine} aria-hidden="true" />}
            {groups.map(({ project, bars }) => (
              <div key={project.id} className="contents">
                <span className="mt-space-sm flex items-center gap-1.5 text-label-md font-semibold" style={{ gridColumn: '1 / -1' }}>
                  <ColorDot color={project.color} />
                  {project.name}
                </span>
                {bars.map(({ task, start, span }) => {
                  const first = Math.max(0, start);
                  const last = Math.min(DAYS, start + Math.max(span, 1));
                  const label = `${task.title} · vence ${formatDate(task.due, { day: 'numeric', month: 'short' })}${span ? ` · ${formatDuration(task.estimateMin)}` : ''}`;
                  return (
                    <div key={task.id} className="contents">
                      <span className="truncate pr-space-sm text-body-sm text-on-surface-variant" style={{ gridColumn: 1 }} title={task.title}>
                        {task.title}
                      </span>
                      <button
                        type="button"
                        onClick={() => actions.openDrawer({ type: 'task', taskId: task.id })}
                        title={label}
                        aria-label={`Editar: ${label}`}
                        className={
                          span
                            ? `h-5 rounded-md opacity-85 transition-opacity hover:opacity-100 ${start < 0 ? 'rounded-l-none' : ''} ${start + span > DAYS ? 'rounded-r-none' : ''}`
                            : 'size-3 rotate-45 justify-self-center rounded-[2px]'
                        }
                        style={{ gridColumn: `${first + 2} / ${last + 2}`, background: project.color }}
                      />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
