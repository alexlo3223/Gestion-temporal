// Cola de avisos que muestra ToastStack. Se mantienen como máximo los 3 más recientes.

export type ToastKind = 'success' | 'info' | 'error' | 'warning';

export interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  body?: string;
  /** Acción opcional, p. ej. "Deshacer". El aviso se cierra al pulsarla. */
  action?: { label: string; run: () => void };
  createdAt: number;
}

export const MAX_TOASTS = 3;

let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

export const toastStore = {
  getSnapshot: () => toasts,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  dismiss(id: number) {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  },
};

/** Muestra un aviso. El más nuevo va delante; los que pasen de 3 se descartan. */
export function notify(toast: Omit<Toast, 'id' | 'createdAt'>) {
  toasts = [{ ...toast, id: nextId++, createdAt: Date.now() }, ...toasts].slice(0, MAX_TOASTS);
  emit();
}
