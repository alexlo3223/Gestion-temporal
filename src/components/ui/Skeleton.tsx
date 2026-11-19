import type { HTMLAttributes } from 'react';

/** Bloque de relleno con brillo mientras carga el contenido real. */
export function Skeleton({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden="true" className={`skeleton ${className}`} {...props} />;
}

/** Esqueleto de una página: cabecera y tarjetas. Se ve mientras se descarga el fragmento de la vista. */
export function PageSkeleton() {
  return (
    <div role="status" aria-label="Cargando" aria-busy="true" className="flex flex-col gap-space-lg">
      <div className="flex flex-col gap-space-xs">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-8 w-64 max-w-full" />
      </div>
      <div className="grid gap-space-md sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-space-md lg:grid-cols-3">
        <Skeleton className="h-72 rounded-xl lg:col-span-2" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
      <span className="sr-only">Cargando…</span>
    </div>
  );
}
