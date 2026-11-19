import { ChevronDown, type LucideIcon } from 'lucide-react';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { EVENT_KINDS, PRIORITIES } from '../../constants';
import type { EventKind, Priority } from '../../types';

export function PageHeader({ kicker, title, actions }: { kicker: ReactNode; title: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-col justify-between gap-space-md lg:flex-row lg:items-end">
      <div className="flex flex-col gap-0.5">
        <p className="caps flex items-center gap-space-xs">
          <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
          {kicker}
        </p>
        <h1 className="text-headline-lg tracking-tight">{title}</h1>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-space-xs">{actions}</div>}
    </header>
  );
}

export function MetricCard({
  label,
  value,
  Icon,
  footer,
  highlight,
  percent = 0,
  barClass = 'bg-primary',
}: {
  label: string;
  value: ReactNode;
  Icon: LucideIcon;
  footer: ReactNode;
  highlight?: ReactNode;
  percent?: number;
  barClass?: string;
}) {
  return (
    <article className="card flex flex-col justify-between gap-space-sm">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="caps">{label}</h3>
          <p className="mt-1 text-headline-lg tabular-nums">{value}</p>
        </div>
        <span className="flex size-8 items-center justify-center rounded-lg bg-surface-container text-primary">
          <Icon size={18} aria-hidden="true" />
        </span>
      </div>
      <div className="flex items-center justify-between gap-2 text-label-sm text-on-surface-variant">
        <span>{footer}</span>
        {highlight && <span className="font-mono text-primary">{highlight}</span>}
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-surface-container" role="presentation">
        <div className={`h-full rounded-full ${barClass}`} style={{ width: `${Math.min(100, percent)}%` }} />
      </div>
    </article>
  );
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-label-caps tracking-wider uppercase ${PRIORITIES[priority].badgeClass}`}>
      {PRIORITIES[priority].label}
    </span>
  );
}

export function ColorDot({ color, size = 8 }: { color: string; size?: number }) {
  return <span className="inline-block shrink-0 rounded-full" style={{ width: size, height: size, background: color }} aria-hidden="true" />;
}

export function EventKindIcon({ kind, size = 13 }: { kind: EventKind; size?: number }) {
  const { Icon } = EVENT_KINDS[kind];
  return <Icon size={size} className="inline-block shrink-0 align-[-2px] text-outline" aria-hidden="true" />;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="p-space-md text-center text-body-sm text-outline">{children}</p>;
}

/** Grupo de botones pegados donde solo uno está activo (periodo, vista…). */
export function SegmentedControl<T extends string>({ label, options, value, onChange }: { label: string; options: Record<T, ReactNode>; value: T; onChange: (value: T) => void }) {
  return (
    <div className="flex items-center rounded-lg bg-surface-container-low p-1" role="group" aria-label={label}>
      {(Object.keys(options) as T[]).map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          aria-pressed={value === key}
          className={`flex items-center gap-1 rounded-md px-space-md py-1.5 text-label-md transition-colors ${value === key ? 'bg-surface-bright font-semibold text-on-surface' : 'text-outline hover:text-on-surface'}`}
        >
          {options[key]}
        </button>
      ))}
    </div>
  );
}

/** Botón que se queda pulsado (aria-pressed). Para interruptores de formulario está blocks/Toggle. */
export function ToggleButton({ pressed, onClick, children, label }: { pressed: boolean; onClick: () => void; children: ReactNode; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      aria-label={label}
      title={label}
      className={`flex items-center gap-1 rounded-lg px-space-sm py-1 text-label-sm transition-colors ${pressed ? 'bg-primary/15 text-primary ring-1 ring-primary/40' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'}`}
    >
      {children}
    </button>
  );
}

/** Acción principal + flecha que despliega acciones relacionadas. */
export function SplitButton({ Icon, label, onClick, menuLabel, items }: { Icon: LucideIcon; label: string; onClick: () => void; menuLabel: string; items: { label: string; onSelect: () => void }[] }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    box.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    const away = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      box.current?.querySelector<HTMLButtonElement>('[aria-haspopup]')?.focus();
    };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', key);
    };
  }, [open]);

  return (
    <div ref={box} className="relative flex">
      <button type="button" onClick={onClick} className="btn btn-primary rounded-r-none">
        <Icon size={16} aria-hidden="true" />
        {label}
      </button>
      <button type="button" onClick={() => setOpen((v) => !v)} className="btn btn-primary rounded-l-none border-l border-on-primary/20 px-2" aria-label={menuLabel} aria-haspopup="menu" aria-expanded={open}>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      {open && (
        <div role="menu" aria-label={menuLabel} className="absolute top-full right-0 z-40 mt-1 flex min-w-48 flex-col rounded-lg border border-border-card bg-surface-container p-1 shadow-overlay">
          {items.map((it) => (
            <button
              key={it.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                it.onSelect();
              }}
              className="rounded-md px-space-sm py-1.5 text-left text-label-md hover:bg-surface-container-high focus-visible:bg-surface-container-high"
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Barra de progreso fina. */
export function ProgressBar({ percent, color, className = 'h-1.5' }: { percent: number; color?: string; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-full bg-surface-container-highest ${className}`} role="presentation">
      <div className={`h-full rounded-full ${color ? '' : 'bg-primary'}`} style={{ width: `${Math.min(100, percent)}%`, background: color }} />
    </div>
  );
}
