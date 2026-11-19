import { Folder, Layers } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/shadcn/button';
import { BoxLabel } from './FormParts';
import { Cascader, CascaderContent, CascaderEmpty, CascaderList, CascaderPanel, CascaderStatus, CascaderTrigger } from '@/components/reui/cascader/cascader';
import { CascaderItems } from '@/components/reui/cascader/cascader-item';
import { CascaderBreadcrumb, CascaderInput, CascaderNav, CascaderValue } from '@/components/reui/cascader/cascader-nav';
import type { CascaderLabels, CascaderNode } from '@/components/reui/cascader/cascader-types';
import type { Project } from '../../types';

const SEP = '::';

/** Textos del cascader en español. */
const LABELS: Partial<CascaderLabels> = {
  search: (parent) => (parent ? `Buscar en ${parent}…` : 'Buscar carpeta o fase…'),
  back: 'Atrás',
  loading: 'Cargando…',
  empty: 'Sin resultados.',
  selectedCount: (count) => `${count} seleccionados`,
  breadcrumbLabel: 'Ruta',
  rootLevel: 'Carpetas',
  itemCount: (count) => (count === 1 ? '1 elemento' : `${count} elementos`),
  branchAffordance: 'submenú',
  selectedState: 'seleccionado',
  panelLabel: 'Opciones',
  keyboardHint: () => 'Flecha derecha para abrir una carpeta y flecha izquierda para volver.',
  resultsAnnouncement: (count) => (count === 1 ? '1 resultado' : `${count} resultados`),
  searchingAnnouncement: 'Buscando…',
};
const NO_PHASE = 'sin-fase';

/** Valor del cascader: la carpeta sola (si no tiene fases) o `carpeta::fase`. */
export const phaseValue = (projectId: string, phaseId: string, projects: Project[]) => {
  const project = projects.find((p) => p.id === projectId);
  if (!project) return '';
  if (project.phases.length === 0) return project.id;
  return `${project.id}${SEP}${phaseId || NO_PHASE}`;
};

/** Árbol Carpeta › Fase. Una carpeta con fases ofrece también «Sin fase»; sin fases, es una hoja. */
export function projectPhaseItems(projects: Project[]): CascaderNode[] {
  return projects.map((p) => ({
    value: p.id,
    label: p.name,
    icon: <span className="inline-block size-2.5 rounded-full" style={{ background: p.color }} aria-hidden="true" />,
    keywords: p.phases.map((f) => f.name),
    children:
      p.phases.length === 0
        ? undefined
        : [
            { value: `${p.id}${SEP}${NO_PHASE}`, label: 'Sin fase', icon: <Layers className="size-4 opacity-60" /> },
            ...p.phases.map((f) => ({ value: `${p.id}${SEP}${f.id}`, label: f.name, icon: <Layers className="size-4" /> })),
          ],
  }));
}

/** Descompone el valor del cascader en carpeta y fase ('' = sin fase). */
export function parsePhaseValue(value: string): { projectId: string; phaseId: string } {
  const [projectId = '', phase = ''] = value.split(SEP);
  return { projectId, phaseId: phase === NO_PHASE ? '' : phase };
}

/**
 * Selector Carpeta › Fase de una tarea (cascader de ReUI). Escribe `projectId` y `phaseId` como campos ocultos
 * del formulario, así `handleSubmit` los recoge igual que el resto.
 */
export function ProjectPhasePicker({ projects, projectId, phaseId }: { projects: Project[]; projectId?: string; phaseId?: string }) {
  const first = projects[0]?.id ?? '';
  const [value, setValue] = useState(() => phaseValue(projectId || first, phaseId ?? '', projects));
  const items = useMemo(() => projectPhaseItems(projects), [projects]);
  const current = parsePhaseValue(value);

  return (
    <div className="relative">
      <input type="hidden" name="projectId" value={current.projectId} />
      <input type="hidden" name="phaseId" value={current.phaseId} />
      <BoxLabel id="project-phase-label">Carpeta › fase</BoxLabel>
      <Cascader items={items} labels={LABELS} value={value} onValueChange={(next) => typeof next === 'string' && setValue(next)}>
        <CascaderTrigger aria-labelledby="project-phase-label" render={<Button variant="outline" className="h-[52px] w-full justify-between gap-2 rounded-xl border-[1.5px] border-outline-variant bg-transparent px-3.5 font-normal" />}>
          <span className="flex min-w-0 items-center gap-2">
            <Folder className="size-4 shrink-0 text-outline" aria-hidden="true" />
            <CascaderValue placeholder="Elige carpeta y fase" />
          </span>
        </CascaderTrigger>
        <CascaderContent className="liquid-glass-menu z-[70] w-72">
          <CascaderPanel>
            <CascaderNav>
              <CascaderInput />
            </CascaderNav>
            <CascaderBreadcrumb />
            <CascaderEmpty />
            <CascaderList>
              <CascaderItems />
            </CascaderList>
            <CascaderStatus />
          </CascaderPanel>
        </CascaderContent>
      </Cascader>
    </div>
  );
}
