import { MessageSquare, Send, Trash2, UserPlus, X } from 'lucide-react';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { actions } from '../../actions';
import { ParticipantForm } from '../forms/ParticipantForm';
import { ME_ID } from '../../constants';
import { authorOf, membersOf, messagesOf } from '../../store/selectors';
import type { AppState, Project } from '../../types';
import { Avatar, AvatarFallback } from '@/components/shadcn/avatar';
import { Bubble, BubbleContent } from '@/components/shadcn/bubble';
import { Message, MessageAvatar, MessageContent, MessageHeader } from '@/components/shadcn/message';
import { ColorDot, EmptyState } from './primitives';

/** Iniciales para el avatar: «Laura Gómez» → LG. */
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

const time = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** Chat de la carpeta con sus participantes. Local: el usuario puede escribir como cualquiera de ellos. */
export function ProjectChat({ state, project }: { state: AppState; project: Project }) {
  const messages = messagesOf(state, project.id);
  const members = membersOf(state, project.id);
  const end = useRef<HTMLDivElement>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    end.current?.scrollIntoView?.({ block: 'nearest' }); // al llegar un mensaje, se ve el último
  }, [messages.length]);

  const send = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    if (actions.postMessage(project.id, data)) form.reset();
  };
  return (
    <section className="card flex flex-col gap-space-sm" aria-label={`Chat de ${project.name}`}>
      <div className="flex flex-wrap items-center justify-between gap-space-sm">
        <h2 className="flex items-center gap-space-xs text-headline-sm font-semibold">
          <MessageSquare size={18} className="text-primary" aria-hidden="true" />
          Chat
        </h2>
        <button type="button" className="btn btn-ghost" onClick={() => setAdding(!adding)} aria-expanded={adding}>
          <UserPlus size={16} aria-hidden="true" />
          Añadir participante
        </button>
      </div>

      <ul className="flex flex-wrap gap-1.5" aria-label="Participantes">
        {members.map((m) => (
          <li key={m.id} className="inline-flex items-center gap-1.5 rounded-full bg-surface-container px-space-sm py-1 text-label-sm">
            <ColorDot color={m.color} />
            {m.name}
            {m.id !== ME_ID && (
              <button type="button" className="icon-btn !p-0.5" onClick={() => actions.removeMember(project.id, m.id)} aria-label={`Quitar a ${m.name}`} title="Quitar">
                <X size={12} />
              </button>
            )}
          </li>
        ))}
      </ul>

      {adding && <ParticipantForm projectId={project.id} onDone={() => setAdding(false)} />}

      <div className="flex h-72 flex-col gap-space-sm scroll-contain overflow-y-auto rounded-lg bg-surface-container/50 p-space-sm" role="log" aria-live="polite">
        {messages.length === 0 && <EmptyState>Aún no hay mensajes. Escribe el primero.</EmptyState>}
        {messages.map((m) => {
          const author = authorOf(state, project.id, m.authorId);
          const mine = m.authorId === ME_ID;
          return (
            <Message key={m.id} align={mine ? 'end' : 'start'} className="group">
              <MessageAvatar>
                <Avatar>
                  <AvatarFallback style={{ background: author.color, color: '#0e0e0e' }}>{initials(author.name)}</AvatarFallback>
                </Avatar>
              </MessageAvatar>
              <MessageContent>
                <MessageHeader className={`text-label-sm text-outline ${mine ? 'justify-end' : ''}`}>
                  {author.name} · {time.format(m.at)}
                </MessageHeader>
                <div className={`flex items-start gap-1 ${mine ? 'flex-row-reverse' : ''}`}>
                  <Bubble variant={mine ? 'default' : 'muted'}>
                    <BubbleContent className="whitespace-pre-wrap">{m.text}</BubbleContent>
                  </Bubble>
                  <button type="button" className="icon-btn !p-0.5 opacity-0 group-hover:opacity-100 focus-visible:opacity-100" onClick={() => actions.deleteMessage(m.id)} aria-label="Eliminar mensaje" title="Eliminar">
                    <Trash2 size={12} />
                  </button>
                </div>
              </MessageContent>
            </Message>
          );
        })}
        <div ref={end} />
      </div>

      <form onSubmit={send} className="flex flex-wrap gap-space-sm">
        <select name="authorId" className="input !h-10 !w-auto" aria-label="Escribir como" defaultValue={ME_ID}>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.id === ME_ID ? `${m.name} (yo)` : m.name}
            </option>
          ))}
        </select>
        <input name="text" className="input !h-10 min-w-40 flex-1" placeholder="Escribe un mensaje…" maxLength={1000} aria-label="Mensaje" autoComplete="off" autoCapitalize="sentences" enterKeyHint="send" />
        <button type="submit" className="btn btn-primary" aria-label="Enviar">
          <Send size={16} aria-hidden="true" />
          Enviar
        </button>
      </form>
    </section>
  );
}
