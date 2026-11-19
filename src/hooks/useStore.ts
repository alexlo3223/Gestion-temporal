import { useSyncExternalStore } from 'react';
import { store } from '../store/store';
import { toastStore } from '../store/toasts';

/** Estado de la app y de la interfaz. El componente se repinta cuando cambian. */
export const useStore = () => useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

export const useToasts = () => useSyncExternalStore(toastStore.subscribe, toastStore.getSnapshot, toastStore.getSnapshot);
