import { es } from 'date-fns/locale';
import { Plus, Settings2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { actions } from '../actions';
import { EmptyState, PageHeader } from '../components/ui/primitives';
import { TaskRow } from '../components/ui/TaskRow';
import { CALENDAR, EVENT_KINDS } from '../constants';
import { useMinute } from '../hooks/useNow';
import { buildCalendarEvents, calendarResources, defaultsFromSlot, moveFromUpdate, parseCalendarId } from '../lib/calendarAdapter';
import { addDays, startOfWeek, toISODate, todayISO } from '../lib/dates';
import type { ViewProps } from '../routes';
import { compareByPriority, openTasks } from '../store/selectors';
import type { AppState } from '../types';
import { Button } from '@/components/shadcn/button';
import { Label } from '@/components/shadcn/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/shadcn/popover';
import { Switch } from '@/components/shadcn/switch';
import { EventCalendar } from '@/components/reui/event-calendar/event-calendar';
import { EventCalendarContent } from '@/components/reui/event-calendar/event-calendar-content';
import type { EventCalendarI18nOverrides } from '@/components/reui/event-calendar/event-calendar-i18n';
import { EventCalendarNav, EventCalendarToolbar } from '@/components/reui/event-calendar/event-calendar-nav';
import type { EventCalendarInteractions, EventCalendarViewSettings } from '@/components/reui/event-calendar/event-calendar-types';

const I18N: EventCalendarI18nOverrides = {
  labels: {
    today: 'Hoy',
    allDay: 'Todo el día',
    noEvents: 'Sin eventos',
    more: (count: number) => `+${count} más`,
  },
  formats: {
    dayTitle: "EEEE, d 'de' MMMM 'de' yyyy",
    agendaDayHeader: "EEEE, d 'de' MMMM",
    moreDayHeader: "EEEE, d 'de' MMMM",
    timeGutter: 'HH:mm',
    timeGutterMinute: 'HH:mm',
    eventTime: 'HH:mm',
  },
  viewNames: {
    month: 'Mes',
    week: 'Semana',
    day: 'Día',
    days: (count: number) => `${count} días`,
    agenda: 'Agenda',
    resource: 'Por carpeta',
  },
};

function PendingPane({ state, now }: { state: AppState; now: Date }) {
  const today = todayISO(now);
  const weekEnd = toISODate(addDays(startOfWeek(now), 6));
  const pending = openTasks(state).sort(compareByPriority);
  const groups: [string, (due: string) => boolean][] = [
    ['Hoy y atrasadas', (due) => !!due && due <= today],
    ['Esta semana', (due) => due > today && due <= weekEnd],
    ['Más adelante', (due) => due > weekEnd],
    ['Sin fecha', (due) => !due],
  ];
  return (
    <aside className="hidden max-h-[calc(100vh-12rem)] w-72 shrink-0 flex-col overflow-hidden rounded-xl bg-surface-container-lowest lg:flex" aria-labelledby="pending-title">
      <div className="flex items-center justify-between border-b border-surface-container-high/40 p-space-md">
        <h2 id="pending-title" className="text-headline-sm font-semibold">
          Pendientes
        </h2>
        <button type="button" onClick={() => actions.openDrawer({ type: 'task', defaults: { due: today } })} className="icon-btn" aria-label="Nueva tarea" title="Nueva tarea">
          <Plus size={16} aria-hidden="true" />
        </button>
      </div>
      <div className="flex flex-1 flex-col gap-space-md scroll-contain overflow-y-auto p-space-sm">
        {pending.length === 0 && <EmptyState>Nada pendiente</EmptyState>}
        {groups.map(([label, matches]) => {
          const tasks = pending.filter((t) => matches(t.due));
          if (!tasks.length) return null;
          return (
            <div key={label}>
              <h3 className="caps px-2 py-1">
                {label} · {tasks.length}
              </h3>
              {tasks.map((t) => (
                <TaskRow key={t.id} task={t} state={state} today={today} />
              ))}
            </div>
          );
        })}
      </div>
    </aside>
  );
}

function SettingSwitch({ id, label, checked, onChange }: { id: string; label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Label htmlFor={id} className="font-normal">
        {label}
      </Label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

/** Ajustes de la vista (solo de esta sesión): lo que se enseña y lo que se puede hacer con el ratón. */
function CalendarSettings({
  viewSettings,
  interactions,
  tooltips,
  onViewSettings,
  onInteractions,
  onTooltips,
}: {
  viewSettings: EventCalendarViewSettings;
  interactions: EventCalendarInteractions;
  tooltips: boolean;
  onViewSettings: (v: EventCalendarViewSettings) => void;
  onInteractions: (v: EventCalendarInteractions) => void;
  onTooltips: (v: boolean) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" size="sm" />}>
        <Settings2 className="size-4" aria-hidden="true" />
        Ajustes
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-72">
        <div className="flex flex-col gap-3">
          <p className="caps">Vista</p>
          <SettingSwitch id="cal-weekends" label="Fines de semana" checked={viewSettings.weekends ?? true} onChange={(weekends) => onViewSettings({ ...viewSettings, weekends })} />
          <SettingSwitch id="cal-weeknumbers" label="Números de semana" checked={viewSettings.weekNumbers ?? false} onChange={(weekNumbers) => onViewSettings({ ...viewSettings, weekNumbers })} />
          <SettingSwitch id="cal-now" label="Indicador de ahora" checked={viewSettings.nowIndicator ?? true} onChange={(nowIndicator) => onViewSettings({ ...viewSettings, nowIndicator })} />
          <SettingSwitch id="cal-tooltips" label="Detalle al pasar el ratón" checked={tooltips} onChange={onTooltips} />
          <p className="caps pt-1">Comportamiento</p>
          <SettingSwitch id="cal-drag" label="Arrastrar para mover" checked={interactions.drag} onChange={(drag) => onInteractions({ ...interactions, drag })} />
          <SettingSwitch id="cal-resize" label="Arrastrar para redimensionar" checked={interactions.resize} onChange={(resize) => onInteractions({ ...interactions, resize })} />
          <SettingSwitch id="cal-select" label="Marcar un hueco para crear" checked={interactions.selectSlot} onChange={(selectSlot) => onInteractions({ ...interactions, selectSlot })} />
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function CalendarView({ state }: ViewProps) {
  const now = useMinute();
  const events = useMemo(() => buildCalendarEvents(state), [state]);
  const resources = useMemo(() => calendarResources(state), [state]);
  const [viewSettings, setViewSettings] = useState<EventCalendarViewSettings>({ weekends: true, weekNumbers: false, nowIndicator: true });
  const [interactions, setInteractions] = useState<EventCalendarInteractions>({ drag: true, resize: true, selectSlot: true });
  const [tooltips, setTooltips] = useState(false);

  return (
    <div className="flex flex-col gap-space-md">
      <PageHeader
        kicker={<span className="first-letter:uppercase">{new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' }).format(now)}</span>}
        title="Calendario"
        actions={
          <button type="button" onClick={() => actions.openDrawer({ type: 'event' })} className="btn btn-primary">
            <Plus size={16} aria-hidden="true" />
            Nuevo evento
          </button>
        }
      />
      <div className="flex items-start gap-space-md">
        <PendingPane state={state} now={now} />
        <section className="min-w-0 flex-1 overflow-hidden rounded-xl bg-surface-container-lowest" aria-label="Calendario">
          <EventCalendar
            events={events}
            resources={resources}
            defaultView="week"
            locale={es}
            i18n={I18N}
            weekStartsOn={1}
            dayStartHour={CALENDAR.firstHour}
            dayEndHour={CALENDAR.lastHour}
            interval={60}
            snapDuration={15}
            viewSettings={viewSettings}
            onViewSettingsChange={setViewSettings}
            interactions={interactions}
            onInteractionsChange={setInteractions}
            eventTooltip={tooltips}
            offDays
            onEventClick={(occurrence) => {
              const target = parseCalendarId(String(occurrence.eventId));
              if (target?.kind === 'event') actions.openDrawer({ type: 'event', eventId: target.id });
              else if (target?.kind === 'task') actions.openDrawer({ type: 'task', taskId: target.id });
            }}
            onEventUpdate={(update) => {
              const move = moveFromUpdate(update);
              if (!move) return false; // tareas, día completo o que cruza de día: no se puede representar
              actions.rescheduleEvent(move.id, move);
            }}
            onSelectSlot={(slot) => actions.openDrawer({ type: 'event', defaults: defaultsFromSlot(slot) })}
            className="h-[calc(100vh-14rem)] min-h-[560px] w-full"
          >
            <div className="flex flex-wrap items-center gap-2 pe-2">
              <EventCalendarNav className="min-w-0 flex-1" />
              <EventCalendarToolbar>
                <CalendarSettings viewSettings={viewSettings} interactions={interactions} tooltips={tooltips} onViewSettings={setViewSettings} onInteractions={setInteractions} onTooltips={setTooltips} />
              </EventCalendarToolbar>
            </div>
            <EventCalendarContent />
          </EventCalendar>
          <div className="flex flex-wrap items-center justify-between gap-space-sm border-t border-surface-container-high/40 px-space-md py-space-sm text-label-sm text-outline">
            <p>Marca un hueco para crear un evento · arrastra para moverlo o cambiar su duración · las tareas con fecha salen como «todo el día»</p>
            <ul className="flex flex-wrap gap-space-sm" aria-label="Tipos de evento">
              {Object.values(EVENT_KINDS).map((k) => (
                <li key={k.label} className="flex items-center gap-1">
                  <k.Icon size={13} aria-hidden="true" /> {k.label}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
