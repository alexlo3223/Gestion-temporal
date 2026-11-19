import { type CSSProperties, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CircleCheck, CircleX, Info, TriangleAlert, X, type LucideIcon } from 'lucide-react';
import { useToasts } from '../../hooks/useStore';
import { MAX_TOASTS, type ToastKind, toastStore } from '../../store/toasts';
import './ToastStack.css';

/* ══ Toast stack ══════════════════════════════════════════
   Hasta tres avisos: el más nuevo delante y los anteriores detrás,
   asomando un poco por encima, cada uno un paso más pequeño. Al pasar
   el puntero el montón se abre en lista; al salir se recoge.

   ADAPTADO para la app: los avisos vienen de store/toasts (antes era
   una lista de demostración), se van solos a los 5 s salvo mientras se
   miran, y el montón cuelga de la esquina inferior: el aviso de delante
   no se mueve al abrir, la lista crece hacia arriba.

   ── ONE SPRING, THREE PLACES ────────────────────────────
   El sitio de cada aviso sale de lo atrás que está y de si el montón
   está abierto, y Framer lo lleva hasta allí con el mismo muelle:
   abrir, cerrar, que uno se vaya y que llegue otro son el mismo gesto. */

const ICON: Record<ToastKind, LucideIcon> = {
  success: CircleCheck,
  info: Info,
  error: CircleX,
  warning: TriangleAlert,
};

const H = 64;
const SHOWN = MAX_TOASTS;
const VISIBLE_MS = 5000;
/* un poco por debajo del amortiguamiento crítico: se asienta con un punto de rebote */
const SPRING = { type: 'spring', stiffness: 380, damping: 34, mass: 1 } as const;

export function ToastStack({ peek = 14, gap = 10, corner = 20 }: { peek?: number; gap?: number; corner?: number }) {
  const stack = useToasts();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement | null>(null);
  const FH = SHOWN * H + (SHOWN - 1) * gap;

  /* se van solos, salvo mientras se están mirando */
  useEffect(() => {
    if (open) return;
    const timers = stack.map((t) =>
      window.setTimeout(() => toastStore.dismiss(t.id), Math.max(1500, t.createdAt + VISIBLE_MS - Date.now())),
    );
    return () => timers.forEach(window.clearTimeout);
  }, [stack, open]);

  const isOpen = open && stack.length > 0;

  const place = (k: number) => {
    if (isOpen) return { y: FH - H - k * (H + gap), scale: 1 };
    const d = Math.min(k, SHOWN - 1);
    return { y: FH - H - d * peek, scale: 1 - d * 0.05 };
  };

  return (
    <div
      ref={root}
      className="tst"
      role="region"
      aria-label="Avisos"
      aria-live="polite"
      data-open={isOpen || undefined}
      style={{ height: FH, '--tst-r': `${corner}px` } as CSSProperties}
      onPointerOver={() => setOpen(true)}
      onPointerOut={(e) => {
        const to = e.relatedTarget as Node | null;
        if (!to || !root.current?.contains(to)) setOpen(false);
      }}
      onFocus={() => setOpen(true)}
      onBlur={(e) => {
        if (!root.current?.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <AnimatePresence initial={false}>
        {stack.map((t, k) => {
          const Icon = ICON[t.kind];
          const p = place(k);
          const front = k === 0;
          const reachable = isOpen || front;
          return (
            <motion.div
              key={t.id}
              className="tst-toast"
              data-kind={t.kind}
              data-front={front || undefined}
              style={{ height: H, zIndex: SHOWN - k }}
              /* uno nuevo sube desde debajo del de delante */
              initial={{ y: place(0).y + 24, scale: 1, opacity: 0, x: 0 }}
              animate={{ y: p.y, scale: p.scale, opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 60, transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } }}
              transition={SPRING}
              aria-hidden={!reachable || undefined}
            >
              <span className="tst-icon">
                <Icon size={18} strokeWidth={2} aria-hidden="true" />
              </span>
              <span className="tst-text">
                <b>{t.title}</b>
                {t.body && <span>{t.body}</span>}
              </span>
              {t.action && (
                <button
                  type="button"
                  className="tst-act"
                  tabIndex={reachable ? 0 : -1}
                  onClick={() => {
                    t.action?.run();
                    toastStore.dismiss(t.id);
                  }}
                >
                  {t.action.label}
                </button>
              )}
              <button
                type="button"
                className="tst-x"
                aria-label={`Cerrar aviso: ${t.title}`}
                tabIndex={reachable ? 0 : -1}
                onClick={() => toastStore.dismiss(t.id)}
              >
                <X size={16} strokeWidth={2} aria-hidden="true" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
