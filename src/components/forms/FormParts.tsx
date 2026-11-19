import { type FormEvent, type ReactNode, useId } from 'react';
import { Trash2, type LucideIcon } from 'lucide-react';
import { actions } from '../../actions';
import type { FormInput, UiState } from '../../types';

export type FieldError = UiState['fieldError'];

/** Mensaje del último error de validación si es de este campo. */
export const errorFor = (fieldError: FieldError, name: string) => (fieldError?.field === name ? fieldError.message : undefined);

/** Convierte el envío de un <form> en un objeto plano para las mutaciones. */
export const handleSubmit = (save: (input: FormInput) => void) => (event: FormEvent<HTMLFormElement>) => {
  event.preventDefault();
  save(Object.fromEntries(new FormData(event.currentTarget)));
};

export function DrawerTitle({ Icon, children }: { Icon: LucideIcon; children: ReactNode }) {
  return (
    <h2 id="drawer-title" className="flex items-center gap-2 text-headline-sm font-semibold">
      <Icon size={18} className="text-primary" aria-hidden="true" />
      {children}
    </h2>
  );
}

/** Selector nativo con el mismo contorno que LabelInput y la etiqueta encima. */
export function SelectField({ label, name, defaultValue, children }: { label: string; name: string; defaultValue?: string; children: ReactNode }) {
  const id = useId();
  return (
    <div>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <select id={id} name={name} defaultValue={defaultValue} className="input cursor-pointer">
        {children}
      </select>
    </div>
  );
}

export function FormFooter({ onDelete }: { onDelete?: () => void }) {
  return (
    <div className="flex items-center gap-space-xs pt-space-sm">
      {onDelete && (
        <button type="button" onClick={onDelete} className="btn btn-danger">
          <Trash2 size={16} aria-hidden="true" />
          Eliminar
        </button>
      )}
      <span className="flex-1" />
      <button type="button" onClick={actions.closeDrawer} className="btn btn-ghost">
        Cancelar
      </button>
      <button type="submit" className="btn btn-primary">
        Guardar
      </button>
    </div>
  );
}
