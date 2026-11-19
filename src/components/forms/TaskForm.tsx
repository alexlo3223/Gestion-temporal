import { ListPlus } from 'lucide-react';
import { actions } from '../../actions';
import { PRIORITIES } from '../../constants';
import { formatDuration } from '../../lib/format';
import type { AppState, Task } from '../../types';
import { LabelInput } from '../blocks/LabelInput';
import { ProjectPhasePicker } from './ProjectPhasePicker';
import { DrawerTitle, type FieldError, FormFooter, SelectField, errorFor, handleSubmit } from './FormParts';

/**
 * Predecesoras: las tareas que deben acabar antes (flechas en el gantt). Siempre se envía un campo, aunque esté vacío,
 * para que desmarcar todas quite las dependencias.
 */
function DependsOnField({ tasks, selected, error }: { tasks: Task[]; selected: string[]; error?: string }) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="field-label">Depende de ({selected.length})</legend>
      <input type="hidden" name="dependsOn" value="" />
      <div className="scroll-contain flex max-h-40 flex-col gap-0.5 overflow-y-auto rounded-xl border border-outline-variant p-1">
        {tasks.length === 0 && <p className="p-2 text-label-sm text-outline">Aún no hay otras tareas en esta carpeta.</p>}
        {tasks.map((t) => (
          <label key={t.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-body-sm hover:bg-surface-container">
            <input type="checkbox" name="dependsOn" value={t.id} defaultChecked={selected.includes(t.id)} className="size-4 shrink-0 accent-primary" />
            <span className="min-w-0 flex-1 truncate">{t.title}</span>
          </label>
        ))}
      </div>
      {error && <p className="text-label-sm text-error">{error}</p>}
    </fieldset>
  );
}

export function TaskForm({
  state,
  task,
  defaults = {},
  fieldError = null,
}: {
  state: AppState;
  task?: Task;
  defaults?: { projectId?: string; due?: string };
  fieldError?: FieldError;
}) {
  const err = (name: string) => errorFor(fieldError, name);
  return (
    <form onSubmit={handleSubmit(actions.saveTask)} className="flex flex-col gap-space-lg">
      <input type="hidden" name="id" value={task?.id ?? ''} />
      <DrawerTitle Icon={ListPlus}>{task ? 'Editar tarea' : 'Nueva tarea'}</DrawerTitle>
      <LabelInput label="Título" name="title" required maxLength={120} autoFocus defaultValue={task?.title} error={err('title')} />
      <ProjectPhasePicker projects={state.projects} projectId={task?.projectId ?? defaults.projectId} phaseId={task?.phaseId} />
      <div className="grid grid-cols-2 gap-space-sm">
        <SelectField label="Prioridad" name="priority" defaultValue={task?.priority ?? 'normal'}>
          {Object.entries(PRIORITIES).map(([key, p]) => (
            <option key={key} value={key}>
              {p.label}
            </option>
          ))}
        </SelectField>
        <LabelInput label="Estimación (min)" name="estimateMin" type="number" min={0} max={1440} step={5} defaultValue={task?.estimateMin ?? 30} error={err('estimateMin')} />
      </div>
      <LabelInput label="Fecha límite" name="due" type="date" defaultValue={task?.due ?? defaults.due ?? ''} error={err('due')} />
      <DependsOnField tasks={state.tasks.filter((t) => t.id !== task?.id && t.projectId === (task?.projectId ?? defaults.projectId))} selected={task?.dependsOn ?? []} error={err('dependsOn')} />
      <LabelInput label="Descripción" name="description" maxLength={500} defaultValue={task?.description} error={err('description')} />
      {task && <p className="text-label-sm text-outline">Tiempo registrado: {formatDuration(task.spentMin)}</p>}
      <FormFooter onDelete={task ? () => actions.deleteTask(task.id) : undefined} />
    </form>
  );
}
