// Estado de la app: inmutable hacia fuera, persistido en localStorage y observable con
// useSyncExternalStore (ver hooks/useStore). Las mutaciones trabajan sobre un borrador.
import { DEFAULT_UI, SCHEMA_VERSION, STORAGE_KEY } from '../constants';
import { createId } from '../lib/id';
import type { AppState, UiState } from '../types';
import { createSampleData } from './sample';

const COLLECTIONS = ['projects', 'tasks', 'events', 'logs'] as const;

function isValidState(value: unknown): value is AppState {
  if (value === null || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    v.version === SCHEMA_VERSION &&
    COLLECTIONS.every((key) => Array.isArray(v[key])) &&
    typeof v.settings === 'object' &&
    typeof v.timer === 'object'
  );
}

function readStorage(): unknown {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null; // almacenamiento bloqueado, JSON corrupto o entorno sin localStorage: se empieza de cero
  }
}

// Nube: si la página la sirve server.mjs (o el .exe), los datos también se guardan en /api/state.
// shortcut: gana la última escritura entre dispositivos; añadir control de versiones si se editan a la vez.
const API = '/api/state';
let remoteReady = false; // no se sube nada hasta haber leído la nube, para no pisarla con datos locales
let pushTimer: ReturnType<typeof setTimeout> | undefined;
function pushRemote(state: AppState) {
  if (!remoteReady) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    fetch(API, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(state), keepalive: true })
      .then((res) => { if (!res.ok) console.warn('La nube rechazó el guardado:', res.status); })
      .catch((error) => console.warn('No se pudo guardar en la nube; queda en este navegador.', error));
  }, 400);
}

let warnedStorage = false;
function writeStorage(state: AppState) {
  pushRemote(state);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    if (!warnedStorage) console.warn('No se pudo guardar en localStorage; los cambios solo duran esta sesión.', error);
    warnedStorage = true;
  }
}

export interface Snapshot {
  state: AppState;
  ui: UiState;
}

const stored = readStorage();
let snapshot: Snapshot = {
  state: isValidState(stored) ? stored : createSampleData({ createId }),
  ui: { ...DEFAULT_UI },
};
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

export const store = {
  getSnapshot: () => snapshot,

  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  /**
   * Aplica una mutación sobre una copia del estado y la publica. Si la mutación lanza
   * (p. ej. ValidationError) el estado no cambia: o se aplica entera o nada.
   */
  update<T>(mutate: (draft: AppState) => T): T {
    const draft = structuredClone(snapshot.state);
    const result = mutate(draft);
    snapshot = { ...snapshot, state: draft };
    writeStorage(draft);
    emit();
    return result;
  },

  setUi(patch: Partial<UiState>) {
    snapshot = { ...snapshot, ui: { ...snapshot.ui, ...patch } };
    emit();
  },

  reset() {
    snapshot = { state: createSampleData({ createId }), ui: { ...DEFAULT_UI } };
    writeStorage(snapshot.state);
    emit();
  },

  /** Guarda el estado inicial (la primera vez son los datos de muestra). */
  persist() {
    writeStorage(snapshot.state);
  },

  /** Carga los datos de la nube si hay API; si no la hay (hosting estático) sigue solo con localStorage. */
  async loadRemote() {
    try {
      const res = await fetch(API, { cache: 'no-store' });
      if (res.status === 404 && res.headers.get('x-gestor-api')) {
        remoteReady = true; // nube vacía: se sube lo local
        pushRemote(snapshot.state);
        return;
      }
      if (!res.ok) return;
      const remote: unknown = await res.json();
      if (!isValidState(remote)) return;
      remoteReady = true;
      snapshot = { ...snapshot, state: remote };
      writeStorage(remote);
      emit();
    } catch {
      // sin API o sin conexión: se trabaja en local
    }
  },
};
