import { PageHeader } from '../components/ui/primitives';
import { RELEASES } from '../data/releases';

const CHANGE_TYPE_CLASS: Record<string, string> = { Nuevo: 'text-primary', Mejorado: 'text-success', Corregido: 'text-warning' };

export function ReleasesView() {
  return (
    <div className="flex max-w-3xl flex-col gap-space-md">
      <PageHeader kicker="Historial de versiones" title="Releases" />
      {RELEASES.map(({ version, date, changes }, index) => (
        <article key={version} className="card flex flex-col gap-space-sm p-space-lg">
          <header className="flex flex-wrap items-center gap-space-sm">
            <h2 className="font-mono text-headline-md font-semibold">{version}</h2>
            {index === 0 && <span className="rounded bg-primary px-1.5 py-0.5 text-label-caps text-on-primary uppercase">Actual</span>}
            <time className="text-label-sm text-outline">{date}</time>
          </header>
          {Object.entries(changes).map(([type, items]) => (
            <section key={type}>
              <h3 className={`caps mb-1 ${CHANGE_TYPE_CLASS[type] ?? ''}`}>{type}</h3>
              <ul className="flex list-disc flex-col gap-1 pl-5 text-body-md text-on-surface-variant marker:text-outline">
                {items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ))}
        </article>
      ))}
    </div>
  );
}
