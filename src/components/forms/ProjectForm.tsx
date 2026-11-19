import { FolderPlus } from 'lucide-react';
import { actions } from '../../actions';
import { PROJECT_COLORS } from '../../constants';
import type { Project } from '../../types';
import { LabelInput } from '../blocks/LabelInput';
import { DrawerTitle, type FieldError, FormFooter, errorFor, handleSubmit } from './FormParts';

export function ProjectForm({ project, fieldError = null }: { project?: Project; fieldError?: FieldError }) {
  const selected = project?.color ?? Object.keys(PROJECT_COLORS)[0];
  return (
    <form onSubmit={handleSubmit(actions.saveProject)} className="flex flex-col gap-space-lg">
      <input type="hidden" name="id" value={project?.id ?? ''} />
      <DrawerTitle Icon={FolderPlus}>{project ? 'Editar carpeta' : 'Nueva carpeta'}</DrawerTitle>
      <LabelInput label="Nombre" name="name" required maxLength={40} autoFocus defaultValue={project?.name} error={errorFor(fieldError, 'name')} />
      <LabelInput label="Descripción" name="description" maxLength={80} defaultValue={project?.description} error={errorFor(fieldError, 'description')} />
      <fieldset>
        <legend className="field-label">Color</legend>
        <div className="flex flex-wrap gap-space-sm">
          {Object.entries(PROJECT_COLORS).map(([color, name]) => (
            <label key={color} className="cursor-pointer" title={name}>
              <input type="radio" name="color" value={color} defaultChecked={color === selected} className="peer sr-only" />
              <span className="sr-only">{name}</span>
              <span
                className="block size-7 rounded-full ring-offset-2 ring-offset-surface-container-low peer-checked:ring-2 peer-checked:ring-on-surface peer-focus-visible:ring-2 peer-focus-visible:ring-primary"
                style={{ background: color }}
                aria-hidden="true"
              />
            </label>
          ))}
        </div>
      </fieldset>
      <FormFooter onDelete={project ? () => actions.deleteProject(project.id) : undefined} />
    </form>
  );
}
