import { Activity, Download, ListTodo, Trophy, Users, Zap } from 'lucide-react';
import { useMemo } from 'react';
import { actions } from '../actions';
import { StackedBars } from '../components/blocks/StackedBars';
import { ColorDot, EmptyState, MetricCard, PageHeader, SegmentedControl, SplitButton } from '../components/ui/primitives';
import { todayISO, weekDays } from '../lib/dates';
import { formatDate, formatDuration, percentOf } from '../lib/format';
import type { ViewProps } from '../routes';
import { dailyFocus, eventsInRange, eventsOn, logsInRange, periodRange, projectOf, sumDurations, sumMinutes, weeklyFocus } from '../store/selectors';
import type { AppState, Period } from '../types';

const PERIODS: Record<Period, string> = { week: 'Esta semana', month: 'Últimos 30 días' };

function Segment({ minutes, total, className, label }: { minutes: number; total: number; className: string; label: string }) {
  if (minutes <= 0) return null;
  const share = minutes / total;
  return (
    <div className={`flex h-full items-center justify-center overflow-hidden rounded px-1 text-label-caps whitespace-nowrap ${className}`} style={{ width: `${share * 100}%` }} title={`${label}: ${formatDuration(minutes)}`}>
      {share > 0.14 && `${formatDuration(minutes)} ${label}`}
    </div>
  );
}

function WeeklyDistribution({ state, now }: { state: AppState; now: Date }) {
  const { workStart, workEnd } = state.settings;
  const workday = (workEnd - workStart) * 60;
  const today = todayISO(now);
  return (
    <section className="card flex flex-col gap-space-md p-space-lg" aria-labelledby="distribution-title">
      <div className="flex flex-wrap items-center justify-between gap-space-md">
        <div>
          <h2 id="distribution-title" className="text-headline-md">
            Distribución horaria semanal
          </h2>
          <p className="text-body-sm text-outline">
            Sobre tu jornada de {workStart}:00 a {workEnd}:00
          </p>
        </div>
        <ul className="flex flex-wrap items-center gap-space-md text-label-sm text-on-surface-variant">
          <li className="flex items-center gap-1.5">
            <span className="size-3 rounded-full bg-primary" />
            Foco registrado
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-3 rounded-full bg-tertiary-fixed" />
            Reuniones
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-3 rounded-full bg-surface-variant" />
            Pausas
          </li>
        </ul>
      </div>
      <div className="flex flex-col gap-space-xs">
        {weekDays(now).map((date) => {
          const focus = sumMinutes(state.logs.filter((l) => l.date === date));
          const events = eventsOn(state, date);
          const meetings = sumDurations(events.filter((ev) => ev.kind === 'reunion'));
          const breaks = sumDurations(events.filter((ev) => ev.kind === 'pausa'));
          const total = Math.max(workday, focus + meetings + breaks);
          return (
            <div key={date} className={`grid grid-cols-[64px_1fr] items-center gap-space-md ${date > today ? 'opacity-60' : ''}`}>
              <span className={`font-mono text-label-caps uppercase ${date === today ? 'text-primary' : 'text-outline'}`}>{formatDate(date, { weekday: 'short', day: 'numeric' })}</span>
              <div className={`flex h-10 w-full gap-0.5 rounded-lg bg-surface-container p-0.5 ${date === today ? 'ring-1 ring-primary/40' : ''}`}>
                <Segment minutes={focus} total={total} className="bg-primary text-on-primary" label="Foco" />
                <Segment minutes={meetings} total={total} className="bg-tertiary-fixed text-on-tertiary-container" label="Calls" />
                <Segment minutes={breaks} total={total} className="bg-surface-variant text-on-surface-variant" label="Pausa" />
                <Segment minutes={total - focus - meetings - breaks} total={total} className="text-outline" label="Libre" />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function TopTasks({ state }: { state: AppState }) {
  const tasks = state.tasks
    .filter((t) => t.spentMin > 0)
    .sort((a, b) => b.spentMin - a.spentMin)
    .slice(0, 5);
  return (
    <section className="card flex flex-col gap-space-sm p-space-lg" aria-labelledby="top-tasks-title">
      <h2 id="top-tasks-title" className="flex items-center gap-space-xs text-headline-md">
        <Trophy size={20} className="text-primary" aria-hidden="true" />
        Tareas con más tiempo invertido
      </h2>
      {tasks.length === 0 ? (
        <EmptyState>Usa ▶ en una tarea para empezar a registrar tiempo</EmptyState>
      ) : (
        <ul className="flex flex-col gap-space-sm">
          {tasks.map((t) => {
            const overrun = t.estimateMin > 0 && t.spentMin > t.estimateMin;
            return (
              <li key={t.id} className="flex items-center gap-space-md">
                <span className="flex w-40 min-w-0 items-center gap-2 text-body-md sm:w-56">
                  <ColorDot color={projectOf(state, t.projectId).color} />
                  <span className="truncate">{t.title}</span>
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-container" role="presentation">
                  <div className={`h-full rounded-full ${overrun ? 'bg-error' : 'bg-primary'}`} style={{ width: `${percentOf(t.spentMin, Math.max(t.estimateMin, t.spentMin))}%` }} />
                </div>
                <span className={`w-28 text-right font-mono text-label-sm ${overrun ? 'text-error' : 'text-outline'}`}>
                  {formatDuration(t.spentMin)} / {formatDuration(t.estimateMin)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function AnalyticsView({ state, ui }: ViewProps) {
  const now = new Date();
  const range = periodRange(ui.period, now);
  const logs = logsInRange(state, range);
  const focus = sumMinutes(logs);
  const meetings = eventsInRange(state, range).filter((ev) => ev.kind === 'reunion');
  const meetingMinutes = sumDurations(meetings);
  const completed = state.tasks.filter((t) => t.doneAt && t.doneAt >= range[0] && t.doneAt <= range[1]).length;
  const focusRatio = Math.round(percentOf(focus, focus + meetingMinutes));
  const goal = state.settings.weeklyGoalHours * 60 * (ui.period === 'month' ? 30 / 7 : 1);

  /* series del gráfico apilado: se recalculan solo si cambian los datos */
  const series = useMemo(() => ({ Day: dailyFocus(state, 20), Week: weeklyFocus(state, 12) }), [state]);
  const categories = state.projects.map((p) => ({ label: p.name, color: p.color }));

  return (
    <div className="flex flex-col gap-space-lg">
      <PageHeader
        kicker={`Time tracking · ${formatDate(range[0], { day: 'numeric', month: 'short' })} – ${formatDate(range[1], { day: 'numeric', month: 'short' })}`}
        title="Analíticas de productividad"
        actions={
          <>
            <SegmentedControl label="Periodo" options={PERIODS} value={ui.period} onChange={actions.setPeriod} />
            <SplitButton
              Icon={Download}
              label="Exportar horas"
              onClick={() => actions.exportCsv(ui.period)}
              menuLabel="Más formatos de exportación"
              items={[
                { label: 'Tareas (CSV)', onSelect: actions.exportTasksCsv },
                { label: 'Eventos (CSV)', onSelect: actions.exportEventsCsv },
                { label: 'Copia completa (JSON)', onSelect: actions.exportBackup },
              ]}
            />
          </>
        }
      />

      <section className="grid grid-cols-1 gap-space-md sm:grid-cols-2 lg:grid-cols-4" aria-label="Indicadores">
        <MetricCard label="Deep work (foco)" value={formatDuration(focus)} Icon={Zap} footer={`Meta: ${formatDuration(goal)}`} highlight={`${Math.round(percentOf(focus, goal))}%`} percent={percentOf(focus, goal)} />
        <MetricCard label="Reuniones y calls" value={formatDuration(meetingMinutes)} Icon={Users} footer={`${meetings.length} reuniones`} percent={percentOf(meetingMinutes, focus + meetingMinutes)} barClass="bg-tertiary-fixed" />
        <MetricCard label="Tareas completadas" value={completed} Icon={ListTodo} footer="En el periodo" percent={Math.min(100, completed * 10)} barClass="bg-secondary-fixed" />
        <MetricCard
          label="Ratio de foco"
          value={`${focusRatio}%`}
          Icon={Activity}
          footer="Foco / (foco + reuniones)"
          highlight={focusRatio >= 60 ? 'Óptimo' : 'Mejorable'}
          percent={focusRatio}
          barClass="bg-primary-container"
        />
      </section>

      <div className="grid grid-cols-1 items-start gap-space-lg xl:grid-cols-2">
        <StackedBars title="Foco por carpeta" unit="de foco" categories={categories} series={series} belowLabel="Tareas completadas (bajo la línea)" format={formatDuration} bars={20} gap={6} colour="Colour" />
        <TopTasks state={state} />
      </div>

      <WeeklyDistribution state={state} now={now} />
    </div>
  );
}
