import { type CSSProperties, type PointerEvent, useEffect, useMemo, useRef, useState } from 'react';
import { animate, motion, useMotionValue, useSpring, useTransform, useVelocity } from 'framer-motion';
import './Toggle.css';

/* ══ Toggle (Liquid) ══════════════════════════════════════
   Un interruptor con una gota por pulgar. Se puede pulsar o arrastrar;
   la gota se alarga en la dirección en que se mueve y adelgaza a lo
   ancho (conservando el área), así la elasticidad está en la forma de
   lo que se mueve y no en una estela.

   ADAPTADO para la app: funciona dentro de un formulario (type="button"
   para no enviarlo, y un input oculto con `name` que lleva el valor),
   recibe `defaultChecked` y su nombre accesible por `labelledBy`.

   ── ONE POSITION, WRITTEN TWO WAYS ──────────────────────
   La x del pulgar es un motion value: el dedo la escribe directamente
   y al soltar la anima un muelle, sin repintar en ningún caso. */

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

const TRACK = 92;
const THUMB = 36;
const PAD = (46 - THUMB) / 2;
const SHUT_X = PAD;
const OPEN_X = TRACK - THUMB - PAD;
const MID_X = (SHUT_X + OPEN_X) / 2;

export function Toggle({
  name,
  defaultChecked = false,
  labelledBy,
  stretch = 36,
  speed = 50,
}: {
  /** Nombre del campo en el formulario; envía "on" cuando está activado. */
  name?: string;
  defaultChecked?: boolean;
  /** id del texto que nombra el interruptor. */
  labelledBy: string;
  stretch?: number;
  speed?: number;
}) {
  const [on, setOn] = useState(defaultChecked);
  /* sujeto: el muelle de reposo se aparta mientras un dedo tiene el pulgar */
  const [held, setHeld] = useState(false);
  const [hot, setHot] = useState(false);
  const rail = useRef<HTMLButtonElement | null>(null);
  const grip = useRef<{ id: number; grab: number | null; moved: boolean } | null>(null);

  const x = useMotionValue<number>(defaultChecked ? OPEN_X : SHUT_X);

  /* ── UN CUERPO: ESTIRAR, NO DEJAR ESTELA ──────────────── */
  const vel = useVelocity(x);
  const eased = useSpring(vel, { stiffness: 380, damping: 34, mass: 0.6 });
  const lengthen = (v: number) => 1 + Math.min(0.4, Math.abs(v) / 600) * (clamp(stretch, 0, 100) / 100);

  /* el aumento al pasar el ratón va en la MISMA transformación (ver original:
     la propiedad `scale` escalaba también el desplazamiento) */
  const swell = useSpring(hot ? 1.035 : 1, { stiffness: 380, damping: 34, mass: 0.6 });
  const wide = useTransform([eased, swell], ([v, s]: number[]) => lengthen(v) * s);
  const tall = useTransform([eased, swell], ([v, s]: number[]) => s / lengthen(v));

  const settle = useMemo(
    () => ({ type: 'spring' as const, stiffness: 170 - (50 - speed) * 1.1, damping: 21.5, mass: 0.9 }),
    [speed],
  );

  useEffect(() => {
    if (held) return;
    const run = animate(x, on ? OPEN_X : SHUT_X, settle);
    return () => run.stop();
  }, [on, held, x, settle]);

  const local = (clientX: number) => {
    const el = rail.current;
    if (!el) return 0;
    const b = el.getBoundingClientRect();
    const k = b.width / (el.offsetWidth || b.width) || 1;
    return (clientX - b.left) / k;
  };

  const down = (e: PointerEvent) => {
    /* sin desplazamiento todavía: se toma en el primer MOVE, así nada salta */
    grip.current = { id: e.pointerId, grab: null, moved: false };
    setHeld(true);
    try {
      rail.current?.setPointerCapture(e.pointerId);
    } catch {
      /* puntero no vivo */
    }
  };

  const move = (e: PointerEvent) => {
    const g = grip.current;
    if (!g || g.id !== e.pointerId) return;
    const at = local(e.clientX);
    if (g.grab === null) g.grab = at - x.get();
    const next = clamp(at - g.grab, SHUT_X, OPEN_X);
    if (Math.abs(next - x.get()) > 0.4) g.moved = true;
    x.set(next);
    /* cambia al pasar por el medio, no al soltar */
    const past = next > MID_X;
    if (past !== on) setOn(past);
  };

  const up = (e: PointerEvent) => {
    const g = grip.current;
    if (!g) return;
    grip.current = null;
    try {
      rail.current?.releasePointerCapture?.(e.pointerId);
    } catch {
      /* nunca capturado */
    }
    /* una pulsación que no se movió es un CLICK, y un click cambia */
    if (!g.moved) setOn((v) => !v);
    setHeld(false);
  };

  return (
    <div className="liq-well" style={{ '--liq-thumb': `${THUMB}px` } as CSSProperties}>
      <button
        ref={rail}
        type="button"
        className="liq-sw"
        data-on={on}
        role="switch"
        aria-checked={on}
        aria-labelledby={labelledBy}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onPointerEnter={() => setHot(true)}
        onPointerLeave={() => setHot(false)}
        onKeyDown={(e) => {
          if (e.key !== ' ' && e.key !== 'Enter') return;
          e.preventDefault();
          setOn((v) => !v);
        }}
      >
        <span className="liq-sw-blobs" aria-hidden="true">
          <motion.span className="liq-thumb" style={{ x, scaleX: wide, scaleY: tall }} />
        </span>
      </button>
      {name && <input type="hidden" name={name} value={on ? 'on' : ''} />}
    </div>
  );
}
