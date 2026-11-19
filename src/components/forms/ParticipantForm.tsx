import { Check } from 'lucide-react';
import { type SyntheticEvent, useRef, useState } from 'react';
import { shake } from '../../lib/shake';
import { actions } from '../../actions';
import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';

/** Valida el nombre al momento; la regla definitiva (nombres repetidos, tope de participantes) la aplica `actions.addMember`. */
function nameError(value: string) {
  const name = value.trim();
  if (name.length < 2) return 'El nombre debe tener al menos 2 caracteres';
  if (name.length > 30) return 'El nombre admite como máximo 30 caracteres';
  return null;
}

/** Alta de un participante de una carpeta. */
export function ParticipantForm({ projectId, onDone }: { projectId: string; onDone: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const field = useRef<HTMLInputElement | null>(null);

  const onSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    const invalid = nameError(String(data.name ?? ''));
    setError(invalid);
    if (invalid) {
      shake(field.current);
      return;
    }
    if (actions.addMember(projectId, data)) {
      form.reset();
      onDone();
    }
  };

  return (
    <form className="flex w-full max-w-sm flex-col gap-4" onSubmit={onSubmit} noValidate>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`member-name-${projectId}`}>Nombre</Label>
        <Input
          id={`member-name-${projectId}`}
          name="name"
          placeholder="Laura"
          ref={field}
          autoFocus
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={`member-hint-${projectId}`}
          onChange={() => error && setError(null)}
        />
        <p id={`member-hint-${projectId}`} className={error ? 'text-label-sm text-destructive' : 'text-label-sm text-muted-foreground'} role={error ? 'alert' : undefined}>
          {error ?? 'Con este nombre aparecerá en el chat y en los documentos.'}
        </p>
      </div>
      <div className="flex gap-2">
        <Button type="submit">
          <Check />
          Añadir
        </Button>
        <Button type="button" variant="secondary" onClick={onDone}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
