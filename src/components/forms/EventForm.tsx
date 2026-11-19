import { CalendarPlus } from 'lucide-react';
import { actions } from '../../actions';
import { EVENT_KINDS } from '../../constants';
import { minutesToTime, todayISO } from '../../lib/dates';
import type { AppState, CalendarEvent } from '../../types';
import { LabelInput } from '../blocks/LabelInput';
import { SlotPicker } from '../blocks/SlotPicker';
import { DrawerTitle, type FieldError, FormFooter, SelectField, errorFor, handleSubmit } from './FormParts';

export function EventForm({
  state,
  event,
  defaults = {},
  fieldError = null,
}: {
  state: AppState;
  event?: CalendarEvent;
  defaults?: { date?: string; start?: string; end?: string; projectId?: string };
  fieldError?: FieldError;
}) {
  const nextHour = Math.min(22, new Date().getHours() + 1);
  return (
    <form onSubmit={handleSubmit(actions.saveEvent)} className="flex flex-col gap-space-lg">
      <input type="hidden" name="id" value={event?.id ?? ''} />
      <DrawerTitle Icon={CalendarPlus}>{event ? 'Editar evento' : 'Nuevo evento'}</DrawerTitle>
      <LabelInput label="Título" name="title" required maxLength={120} autoFocus defaultValue={event?.title} error={errorFor(fieldError, 'title')} />
      <div className="grid grid-cols-2 gap-space-sm">
        <SelectField label="Carpeta" name="projectId" defaultValue={event?.projectId ?? defaults.projectId}>
          {state.projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </SelectField>
        <SelectField label="Tipo" name="kind" defaultValue={event?.kind ?? 'reunion'}>
          {Object.entries(EVENT_KINDS).map(([key, k]) => (
            <option key={key} value={key}>
              {k.label}
            </option>
          ))}
        </SelectField>
      </div>
      <SlotPicker
        state={state}
        eventId={event?.id}
        date={event?.date ?? defaults.date ?? todayISO()}
        start={event?.start ?? defaults.start ?? minutesToTime(nextHour * 60)}
        end={event?.end ?? defaults.end ?? minutesToTime((nextHour + 1) * 60)}
        error={errorFor(fieldError, 'date') ?? errorFor(fieldError, 'start') ?? errorFor(fieldError, 'end')}
      />
      <FormFooter onDelete={event ? () => actions.deleteEvent(event.id) : undefined} />
    </form>
  );
}
