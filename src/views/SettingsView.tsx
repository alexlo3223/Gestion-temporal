import { Download, Save } from 'lucide-react';
import { useState } from 'react';
import { actions } from '../actions';
import { LabelInput } from '../components/blocks/LabelInput';
import { Otp } from '../components/blocks/Otp';
import { Toggle } from '../components/blocks/Toggle';
import { SelectField, errorFor, handleSubmit } from '../components/forms/FormParts';
import { PageHeader } from '../components/ui/primitives';
import { TIMEZONES } from '../constants';
import type { ViewProps } from '../routes';

const randomCode = () => String(Math.floor(1000 + Math.random() * 9000));

/** Restablecer borra todo: se confirma escribiendo un código que se muestra en pantalla. */
function ResetData() {
  const [code, setCode] = useState(randomCode);
  return (
    <div className="flex flex-col gap-space-sm border-t border-surface-container-high pt-space-md">
      <h3 className="text-headline-sm text-error">Restablecer datos de muestra</h3>
      <p className="text-body-sm text-outline">
        Borra tus tareas, eventos, carpetas y horas. Para confirmar, escribe <b className="font-mono text-on-surface tracking-widest">{code}</b>:
      </p>
      <Otp
        key={code}
        length={4}
        expected={code}
        label={`Escribe ${code} para confirmar`}
        onVerified={() => {
          actions.resetData();
          setCode(randomCode());
        }}
      />
    </div>
  );
}

export function SettingsView({ state, ui }: ViewProps) {
  const s = state.settings;
  const err = (name: string) => errorFor(ui.fieldError, name);
  return (
    <div className="flex max-w-3xl flex-col gap-space-md">
      <PageHeader kicker="Preferencias guardadas en este navegador" title="Ajustes" />
      {/* key: si los ajustes cambian desde fuera (p. ej. al restablecer), el formulario se reinicia */}
      <form key={JSON.stringify(s)} onSubmit={handleSubmit(actions.saveSettings)} className="card grid gap-space-lg p-space-lg sm:grid-cols-2">
        <div className="sm:col-span-2">
          <LabelInput label="Nombre" name="name" required maxLength={40} autoComplete="given-name" defaultValue={s.name} error={err('name')} />
        </div>
        <SelectField label="Segunda zona horaria (reloj de Inicio)" name="secondTimezone" defaultValue={s.secondTimezone}>
          {Object.entries(TIMEZONES).map(([tz, label]) => (
            <option key={tz} value={tz}>
              {label}
            </option>
          ))}
        </SelectField>
        <div className="self-end">
          <LabelInput label="Objetivo de foco semanal (h)" name="weeklyGoalHours" type="number" min={1} max={80} required defaultValue={s.weeklyGoalHours} error={err('weeklyGoalHours')} />
        </div>
        <LabelInput label="Inicio de jornada (hora)" name="workStart" type="number" min={0} max={23} required defaultValue={s.workStart} error={err('workStart')} />
        <LabelInput label="Fin de jornada (hora)" name="workEnd" type="number" min={1} max={24} required defaultValue={s.workEnd} error={err('workEnd')} />
        <LabelInput label="Duración del pomodoro (min)" name="pomodoroMinutes" type="number" min={1} max={120} required defaultValue={s.pomodoroMinutes} error={err('pomodoroMinutes')} />
        <div className="flex items-center justify-between gap-space-md">
          <span id="notify-label" className="text-body-md">
            Notificar al terminar un pomodoro
          </span>
          <Toggle name="notify" labelledBy="notify-label" defaultChecked={s.notify} />
        </div>
        <div className="flex justify-end sm:col-span-2">
          <button type="submit" className="btn btn-primary">
            <Save size={16} aria-hidden="true" />
            Guardar cambios
          </button>
        </div>
      </form>

      <section className="card flex flex-col gap-space-md p-space-lg" aria-labelledby="data-title">
        <div className="flex flex-col gap-space-sm">
          <h2 id="data-title" className="text-headline-sm font-semibold">
            Datos
          </h2>
          <p className="text-body-sm text-outline">Todo se guarda solo en el almacenamiento local de este navegador. Exporta una copia si no quieres perderlo.</p>
          <div>
            <button type="button" onClick={actions.exportBackup} className="btn btn-ghost">
              <Download size={16} aria-hidden="true" />
              Exportar copia (JSON)
            </button>
          </div>
        </div>
        <ResetData />
      </section>
    </div>
  );
}
