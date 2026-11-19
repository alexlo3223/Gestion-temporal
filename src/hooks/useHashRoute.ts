import { useSyncExternalStore } from 'react';

const subscribe = (listener: () => void) => {
  window.addEventListener('hashchange', listener);
  return () => window.removeEventListener('hashchange', listener);
};
const getHash = () => window.location.hash.slice(1);

/** Ruta actual a partir del hash (`#tasks` → 'tasks'). */
export const useHashRoute = () => useSyncExternalStore(subscribe, getHash, () => '');

/** Parte el hash en ruta y parámetros: `projects/app/chat` → { route: 'projects', params: ['app', 'chat'] }. */
export function parseHash(hash: string) {
  const [route = '', ...params] = hash.split('/').map(decodeURIComponent);
  return { route, params };
}

export const navigate = (route: string) => {
  window.location.hash = route;
};
