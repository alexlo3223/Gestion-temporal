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
  // un nombre repetido (casillas marcadas, p. ej. dependencias) llega como lista
  const data: FormInput = {};
  new FormData(event.currentTarget).forEach((value, key) => {
    const previous = data[key];
    data[key] = previous === undefined ? value : Array.isArray(previous) ? [...previous, value] : [previous, value];
  });
  save(data);
};

export function DrawerTitle({ Icon, children }: { Icon: LucideIcon; children: ReactNode }) {
  return (
    <h2 id="drawer-title" className="flex items-center gap-2 text-headline-sm font-semibold">
      <Icon size={18} className="text-primary" aria-hidden="true" />
      {children}
    </h2>
  );
}

/** Etiqueta sobre el borde de una caja de 52 px, igual que LabelInput: todos los campos de un formulario quedan a la misma altura. */
export function BoxLabel({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <span id={id} className="pointer-events-none absolute -top-2 left-3.5 z-10 bg-surface-container-low px-1 text-label-sm text-outline">
      {children}
    </span>
  );
}

/** Selector nativo con el mismo contorno y la misma etiqueta sobre el borde que LabelInput. */
export function SelectField({ label, name, defaultValue, children }: { label: string; name: string; defaultValue?: string; children: ReactNode }) {
  const id = useId();
  return (
    <div className="relative">
      <BoxLabel>
        <label htmlFor={id}>{label}</label>
      </BoxLabel>
      <select id={id} name={name} defaultValue={defaultValue} className="input !h-[52px] cursor-pointer">
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
