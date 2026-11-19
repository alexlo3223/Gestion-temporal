import { ListPlus } from 'lucide-react';
import { actions } from '../../actions';
import { PRIORITIES } from '../../constants';
import { formatDuration } from '../../lib/format';
import type { AppState, Task } from '../../types';
import { LabelInput } from '../blocks/LabelInput';
import { DrawerTitle, type FieldError, FormFooter, SelectField, errorFor, handleSubmit } from './FormParts';

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
      <div className="grid grid-cols-2 gap-space-sm">
        <SelectField label="Carpeta" name="projectId" defaultValue={task?.projectId ?? defaults.projectId}>
          {state.projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </SelectField>
        <SelectField label="Prioridad" name="priority" defaultValue={task?.priority ?? 'normal'}>
          {Object.entries(PRIORITIES).map(([key, p]) => (
            <option key={key} value={key}>
              {p.label}
            </option>
          ))}
        </SelectField>
      </div>
      <div className="grid grid-cols-2 gap-space-sm">
        <LabelInput label="Estimación (min)" name="estimateMin" type="number" min={0} max={1440} step={5} defaultValue={task?.estimateMin ?? 30} error={err('estimateMin')} />
        <LabelInput label="Fecha límite" name="due" type="date" defaultValue={task?.due ?? defaults.due ?? ''} error={err('due')} />
      </div>
      <LabelInput label="Descripción" name="description" maxLength={500} defaultValue={task?.description} error={err('description')} />
      {task && <p className="text-label-sm text-outline">Tiempo registrado: {formatDuration(task.spentMin)}</p>}
      <FormFooter onDelete={task ? () => actions.deleteTask(task.id) : undefined} />
    </form>
  );
}
