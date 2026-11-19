// Migraciones del estado guardado (localStorage o nube): suben un estado antiguo a la versión actual sin perder datos.
import { SCHEMA_VERSION } from '../constants';

type Raw = Record<string, unknown>;
const isObject = (v: unknown): v is Raw => v !== null && typeof v === 'object' && !Array.isArray(v);

/** v2 → v3: carpetas con participantes, y mensajes y documentos por carpeta. */
function v2ToV3(state: Raw): Raw {
  const projects = Array.isArray(state.projects) ? state.projects.map((p) => (isObject(p) ? { ...p, members: Array.isArray(p.members) ? p.members : [] } : p)) : state.projects;
  return { ...state, projects, messages: Array.isArray(state.messages) ? state.messages : [], docs: Array.isArray(state.docs) ? state.docs : [], version: 3 };
}

/** v3 → v4: fases por carpeta, y fase e inicio por tarea. */
function v3ToV4(state: Raw): Raw {
  const projects = Array.isArray(state.projects) ? state.projects.map((p) => (isObject(p) ? { ...p, phases: Array.isArray(p.phases) ? p.phases : [] } : p)) : state.projects;
  const tasks = Array.isArray(state.tasks)
    ? state.tasks.map((t) => (isObject(t) ? { ...t, phaseId: typeof t.phaseId === 'string' ? t.phaseId : '', start: typeof t.start === 'string' ? t.start : '' } : t))
    : state.tasks;
  return { ...state, projects, tasks, version: 4 };
}

/** v4 → v5: dependencias entre tareas. */
function v4ToV5(state: Raw): Raw {
  const tasks = Array.isArray(state.tasks) ? state.tasks.map((t) => (isObject(t) ? { ...t, dependsOn: Array.isArray(t.dependsOn) ? t.dependsOn : [] } : t)) : state.tasks;
  return { ...state, tasks, version: 5 };
}

/** Devuelve el estado en la versión actual, o tal cual si no es migrable (la validación lo descartará). */
export function migrateState(value: unknown): unknown {
  if (!isObject(value) || typeof value.version !== 'number') return value;
  let state: Raw = value;
  if (state.version === 2) state = v2ToV3(state);
  if (state.version === 3) state = v3ToV4(state);
  if (state.version === 4) state = v4ToV5(state);
  return state.version === SCHEMA_VERSION ? state : value;
}
