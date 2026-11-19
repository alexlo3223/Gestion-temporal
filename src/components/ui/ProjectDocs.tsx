import { FilePlus, FileText, NotebookPen, Trash2 } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { actions } from '../../actions';
import { authorOf, docsOf } from '../../store/selectors';
import type { AppState, DocKind, Project } from '../../types';
import { EmptyState } from './primitives';

const KIND_LABEL: Record<DocKind, string> = { nota: 'Nota', documento: 'Documento' };
const date = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/**
 * Documentos y notas compartidos de la carpeta: lista a un lado y editor al otro.
 * Con `kind` solo muestra ese tipo (las ramas Documentos y Notas del árbol); sin él, los dos.
 */
export function ProjectDocs({ state, project, kind, selectedId, onSelect }: { state: AppState; project: Project; kind?: DocKind; selectedId?: string; onSelect?: (id: string | undefined) => void }) {
  const docs = docsOf(state, project.id, kind);
  const [localId, setLocalId] = useState<string | undefined>();
  const [creating, setCreating] = useState(false);
  const currentId = onSelect ? selectedId : localId;
  const select = (id: string | undefined) => (onSelect ? onSelect(id) : setLocalId(id));
  const current = creating ? undefined : docs.find((d) => d.id === currentId) ?? docs[0];
  const title = kind === 'nota' ? 'Notas' : kind === 'documento' ? 'Documentos' : 'Documentos y notas';
  const Icon = kind === 'nota' ? NotebookPen : FileText;

  const save = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const saved = actions.saveDoc(project.id, Object.fromEntries(new FormData(e.currentTarget)));
    if (saved) {
      setCreating(false);
      select(saved.id);
    }
  };
  const remove = (id: string) => {
    actions.deleteDoc(id);
    select(undefined);
  };

  return (
    <section className="card flex flex-col gap-space-sm" aria-label={`${title} de ${project.name}`}>
      <div className="flex items-center justify-between gap-space-sm">
        <h2 className="flex items-center gap-space-xs text-headline-sm font-semibold">
          <Icon size={18} className="text-primary" aria-hidden="true" />
          {title}
        </h2>
        <button type="button" className="btn btn-ghost" onClick={() => setCreating(true)}>
          <FilePlus size={16} aria-hidden="true" />
          {kind === 'nota' ? 'Nueva nota' : kind === 'documento' ? 'Nuevo documento' : 'Nuevo'}
        </button>
      </div>
      <div className="grid gap-space-md md:grid-cols-[14rem_1fr]">
        <ul className="flex max-h-80 flex-col gap-0.5 scroll-contain overflow-y-auto" aria-label="Lista">
          {docs.length === 0 && <EmptyState>Nada todavía.</EmptyState>}
          {docs.map((d) => (
            <li key={d.id}>
              <button
                type="button"
                onClick={() => {
                  setCreating(false);
                  select(d.id);
                }}
                aria-current={!creating && current?.id === d.id}
                className={`flex w-full flex-col items-start rounded-lg px-space-sm py-1.5 text-left transition-colors hover:bg-surface-container ${!creating && current?.id === d.id ? 'bg-surface-container-high' : ''}`}
              >
                <span className="w-full truncate text-body-sm font-medium">{d.title}</span>
                <span className="text-label-sm text-outline">
                  {KIND_LABEL[d.kind]} · {authorOf(state, project.id, d.authorId).name} · {date.format(d.updatedAt)}
                </span>
              </button>
            </li>
          ))}
        </ul>
        {(current || creating || docs.length === 0) && (
          <form key={creating ? 'new' : `${current?.id}-${current?.updatedAt}`} onSubmit={save} className="flex flex-col gap-space-sm">
            <input type="hidden" name="id" value={current?.id ?? ''} />
            {kind ? <input type="hidden" name="kind" value={kind} /> : (
              <select name="kind" className="input !h-10 !w-auto self-start" aria-label="Tipo" defaultValue={current?.kind ?? 'nota'}>
                <option value="nota">Nota</option>
                <option value="documento">Documento</option>
              </select>
            )}
            <input name="title" className="input !h-10" placeholder="Título" aria-label="Título" maxLength={80} required defaultValue={current?.title} />
            <textarea name="body" className="input min-h-48 resize-y py-2" placeholder="Escribe aquí…" aria-label="Contenido" maxLength={20000} defaultValue={current?.body} />
            <div className="flex justify-between gap-space-sm">
              {current ? (
                <button type="button" className="btn btn-danger" onClick={() => remove(current.id)}>
                  <Trash2 size={16} aria-hidden="true" />
                  Eliminar
                </button>
              ) : (
                <span />
              )}
              <button type="submit" className="btn btn-primary">
                Guardar
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
