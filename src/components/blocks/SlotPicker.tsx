import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { minutesToTime, monthGridDays, parseISODate, startOfMonth, timeToMinutes, todayISO, toISODate } from '../../lib/dates';
import { formatDate } from '../../lib/format';
import { daySlots, eventsOn } from '../../store/selectors';
import type { AppState } from '../../types';
import { LabelInput } from './LabelInput';

/* ══ Slot picker ══════════════════════════════════════════
   Elegir día en un mini calendario y la hora en una lista de franjas
   de la jornada; las que chocan con otro evento salen deshabilitadas.
   Envía `date`, `start` y `end` como campos del formulario, igual que
   los inputs que sustituye. "Hora exacta" vuelve a los inputs nativos
   para lo que no cae en una franja de 30 min. */

const STEP = 30;
const DURATIONS = [30, 60, 90, 120];

export function SlotPicker({
  state,
  eventId,
  date: initialDate,
  start: initialStart,
  end: initialEnd,
  error,
}: {
  state: AppState;
  /** Evento que se edita: su propio hueco cuenta como libre. */
  eventId?: string;
  date: string;
  start: string;
  end: string;
  error?: string;
}) {
  const { workStart, workEnd } = state.settings;
  const startMin = timeToMinutes(initialStart);
  const onGrid = startMin % STEP === 0 && startMin >= workStart * 60 && startMin < workEnd * 60;

  const [date, setDate] = useState(initialDate);
  const [month, setMonth] = useState(0);
  const [duration, setDuration] = useState(Math.max(STEP, timeToMinutes(initialEnd) - startMin) || 60);
  const [start, setStart] = useState<string | null>(onGrid ? initialStart : null);
  const [exact, setExact] = useState(!onGrid);

  const base = parseISODate(initialDate);
  const days = monthGridDays(base, month);
  const shownMonth = startOfMonth(base, month);
  const today = todayISO();
  const slots = daySlots(state, date, { duration, step: STEP, ignoreId: eventId });
  const durations = DURATIONS.includes(duration) ? DURATIONS : [...DURATIONS, duration].sort((a, b) => a - b);

  return (
    <fieldset className="flex flex-col gap-space-sm">
      <legend className="field-label">Fecha y hora</legend>
      <input type="hidden" name="date" value={date} />

      <div className="rounded-xl bg-surface-container p-space-sm">
        <div className="mb-1 flex items-center justify-between">
          <button type="button" onClick={() => setMonth((m) => m - 1)} className="icon-btn" aria-label="Mes anterior">
            <ChevronLeft size={16} aria-hidden="true" />
          </button>
          <span className="text-label-md font-semibold first-letter:uppercase" aria-live="polite">
            {formatDate(toISODate(shownMonth), { month: 'long', year: 'numeric' })}
          </span>
          <button type="button" onClick={() => setMonth((m) => m + 1)} className="icon-btn" aria-label="Mes siguiente">
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-0.5 text-center" role="group" aria-label="Día">
          {days.slice(0, 7).map((d) => (
            <span key={d} className="py-1 text-label-caps text-outline uppercase" aria-hidden="true">
              {formatDate(d, { weekday: 'narrow' })}
            </span>
          ))}
          {days.map((d) => {
            const selected = d === date;
            const outside = parseISODate(d).getMonth() !== shownMonth.getMonth();
            const busy = eventsOn(state, d).some((e) => e.id !== eventId);
            return (
              <button
                key={d}
                type="button"
                onClick={() => {
                  setDate(d);
                  if (!exact) setStart(null);
                }}
                aria-pressed={selected}
                aria-label={formatDate(d, { weekday: 'long', day: 'numeric', month: 'long' })}
                className={`relative rounded-md py-1 text-label-md tabular-nums transition-colors ${
                  selected ? 'bg-primary font-semibold text-on-primary' : d === today ? 'text-primary hover:bg-surface-container-high' : 'hover:bg-surface-container-high'
                } ${outside && !selected ? 'text-outline/60' : ''}`}
              >
                {formatDate(d, { day: 'numeric' })}
                {busy && !selected && <span className="absolute bottom-0.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-outline" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      </div>

      {exact ? (
        <div className="grid grid-cols-2 gap-space-sm">
          <LabelInput label="Inicio" name="start" type="time" required step={300} defaultValue={initialStart} />
          <LabelInput label="Fin" name="end" type="time" required step={300} defaultValue={initialEnd} />
        </div>
      ) : (
        <>
          <input type="hidden" name="start" value={start ?? ''} />
          <input type="hidden" name="end" value={start ? minutesToTime(Math.min(24 * 60 - 1, timeToMinutes(start) + duration)) : ''} />
          <div className="flex items-center justify-between gap-space-sm">
            <span className="text-label-md first-letter:uppercase">{formatDate(date, { weekday: 'long', day: 'numeric' })}</span>
            <label className="flex items-center gap-1 text-label-sm text-outline">
              Duración
              <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="cursor-pointer rounded-md bg-surface-container px-1.5 py-1 text-on-surface outline-none">
                {durations.map((d) => (
                  <option key={d} value={d}>
                    {d < 60 ? `${d} min` : `${d / 60} h`}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid max-h-48 grid-cols-4 gap-1 scroll-contain overflow-y-auto pr-0.5" role="group" aria-label="Hora de inicio">
            {slots.map((s) => (
              <button
                key={s.time}
                type="button"
                disabled={!s.free}
                onClick={() => setStart(s.time)}
                aria-pressed={start === s.time}
                className={`rounded-md py-1.5 font-mono text-label-sm transition-colors disabled:cursor-not-allowed disabled:line-through disabled:opacity-35 ${
                  start === s.time ? 'bg-primary text-on-primary' : 'border border-outline-variant hover:bg-surface-container-high'
                }`}
              >
                {s.time}
              </button>
            ))}
          </div>
          {start && (
            <p className="text-label-sm text-outline">
              {start} – {minutesToTime(Math.min(24 * 60 - 1, timeToMinutes(start) + duration))}
            </p>
          )}
        </>
      )}

      {error && (
        <p className="text-label-sm text-error" role="alert">
          {error}
        </p>
      )}
      <button type="button" onClick={() => setExact((v) => !v)} className="self-start text-label-sm text-primary hover:underline">
        {exact ? 'Elegir una franja libre' : 'Poner una hora exacta'}
      </button>
    </fieldset>
  );
}
