import { describe, expect, it } from 'vitest';
import { SCHEMA_VERSION } from '../src/constants';
import { migrateState } from '../src/store/migrate';
import { createState } from './fixtures';

type Current = ReturnType<typeof createState>;

/** Estado de la versión 3: sin fases en las carpetas ni fase e inicio en las tareas. */
function v3State() {
  const state = createState();
  return {
    ...state,
    version: 3,
    projects: state.projects.map(({ phases: _phases, ...p }) => p),
    tasks: state.tasks.map(({ phaseId: _phaseId, start: _start, dependsOn: _deps, ...t }) => t),
  };
}

/** Estado de la versión 2: además, sin participantes, mensajes ni documentos. */
function v2State() {
  const { messages: _m, docs: _d, ...rest } = v3State();
  return { ...rest, version: 2, projects: rest.projects.map(({ members: _members, ...p }) => p) };
}

describe('migración del estado', () => {
  it('v3 → v4 conserva todo y añade fases por carpeta, y fase e inicio por tarea', () => {
    const old = v3State();
    const migrated = migrateState(old) as Current;
    expect(migrated.version).toBe(SCHEMA_VERSION);
    expect(migrated.projects[0]).toMatchObject({ id: 'p1', name: 'Proyecto', members: [], phases: [] });
    expect(migrated.tasks.map((t) => [t.id, t.title, t.due])).toEqual(old.tasks.map((t) => [t.id, t.title, t.due]));
    expect(migrated.tasks.every((t) => t.phaseId === '' && t.start === '')).toBe(true);
  });

  it('v2 → v4 encadena las dos migraciones sin perder tareas ni carpetas', () => {
    const old = v2State();
    const migrated = migrateState(old) as Current;
    expect(migrated.version).toBe(SCHEMA_VERSION);
    expect(migrated.projects[0]).toMatchObject({ id: 'p1', members: [], phases: [] });
    expect(migrated.messages).toEqual([]);
    expect(migrated.docs).toEqual([]);
    expect(migrated.tasks).toHaveLength(old.tasks.length);
    expect(migrated.tasks[0]).toMatchObject({ phaseId: '', start: '' });
  });

  it('no pisa lo que ya tiene el estado migrado', () => {
    const old = v3State() as unknown as Record<string, unknown>;
    (old.projects as Record<string, unknown>[])[0].phases = [{ id: 'f', name: 'Fase' }];
    (old.tasks as Record<string, unknown>[])[0].phaseId = 'f';
    const migrated = migrateState(old) as Current;
    expect(migrated.projects[0].phases).toEqual([{ id: 'f', name: 'Fase' }]);
    expect(migrated.tasks[0].phaseId).toBe('f');
  });

  it('un estado ya actual pasa igual', () => {
    const current = createState();
    expect(migrateState(current)).toBe(current);
  });

  it('lo que no se puede migrar se devuelve tal cual para que la validación lo descarte', () => {
    expect(migrateState(null)).toBeNull();
    expect(migrateState('x')).toBe('x');
    const future = { version: 99 };
    expect(migrateState(future)).toBe(future);
    const ancient = { version: 1 };
    expect(migrateState(ancient)).toBe(ancient);
  });
});

describe('migración a v5: dependencias', () => {
  it('v4 → v5 añade la lista de dependencias a las tareas sin tocar lo demás', () => {
    const v4 = { ...createState(), version: 4 } as unknown as Record<string, unknown>;
    const tasks = (v4.tasks as Record<string, unknown>[]).map(({ dependsOn: _d, ...t }) => t);
    const migrated = migrateState({ ...v4, tasks }) as Current;
    expect(migrated.version).toBe(SCHEMA_VERSION);
    expect(migrated.tasks.every((t) => Array.isArray(t.dependsOn) && t.dependsOn.length === 0)).toBe(true);
    expect(migrated.tasks.map((t) => t.title)).toEqual(createState().tasks.map((t) => t.title));
  });
});
