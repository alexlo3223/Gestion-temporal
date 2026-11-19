import { type CSSProperties, type InputHTMLAttributes, useId, useLayoutEffect, useRef, useState } from 'react';
import { useElementWidth } from '../../hooks/useElementWidth';
import { clamp } from '../../lib/format';
import './LabelInput.css';

/* ══ Label input ══════════════════════════════════════════
   Un campo cuya etiqueta es su placeholder hasta que entras en él.
   Al enfocar, la etiqueta sube al borde superior con un pequeño salto
   que recorre sus letras, el contorno se oscurece y la línea de arriba
   se abre bajo la etiqueta desde su centro hacia fuera.

   ADAPTADO para la app: es un campo de formulario real (name, type,
   required… se pasan al <input>), el ancho se mide del contenedor en
   vez de ser fijo, y fechas/horas llevan la etiqueta siempre arriba
   porque el navegador pinta su propio placeholder. Se quitan el modo
   escaparate y el ojo de contraseña, que la app no usa.

   ── ONE THING MOVES ─────────────────────────────────────
   El contorno siempre está entero; el foco solo cambia su tinta y
   abre el hueco. El hueco son dos trazos cortos, cada uno del centro
   a un lado, que se retiran con un dash offset negativo. */

const H = 52;
/* tamaño de la etiqueta levantada respecto al de reposo */
const S = 0.78;
/* el trazo va medio trazo hacia dentro para que el svg no lo recorte */
const IN = 0.75;

/**
 * Teclado y correcciones adecuados a cada tipo de campo en móvil: numérico para números (y códigos de un solo uso, que además
 * se rellenan solos desde el SMS), sin mayúscula inicial ni autocorrector en emails, URLs y contraseñas.
 * Lo que se pase explícito al campo manda sobre esto.
 */
export function fieldHints(type: string, autoComplete?: string, step?: string | number): InputHTMLAttributes<HTMLInputElement> {
  if (autoComplete === 'one-time-code') return { inputMode: 'numeric', autoCapitalize: 'none', autoCorrect: 'off', spellCheck: false };
  switch (type) {
    case 'number':
      return { inputMode: step !== undefined && step !== 'any' && !Number.isInteger(Number(step)) ? 'decimal' : 'numeric' };
    case 'email':
      return { inputMode: 'email', autoCapitalize: 'none', autoCorrect: 'off', spellCheck: false };
    case 'url':
      return { inputMode: 'url', autoCapitalize: 'none', autoCorrect: 'off', spellCheck: false };
    case 'tel':
      return { inputMode: 'tel' };
    case 'password':
      return { autoCapitalize: 'none', autoCorrect: 'off', spellCheck: false };
    default:
      return {};
  }
}

type Props = {
  label: string;
  corner?: number;
  onValueChange?: (value: string) => void;
  /** Mensaje de validación: pinta el contorno en rojo y lo lee el lector de pantalla. */
  error?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'style' | 'value' | 'onChange' | 'children'>;

export function LabelInput({ label, corner = 12, defaultValue, type = 'text', onValueChange, onFocus, onBlur, id: idProp, error, ...rest }: Props) {
  const wrap = useRef<HTMLDivElement | null>(null);
  const W = useElementWidth(wrap, 280);
  const r = clamp(corner, 0, H / 2);
  const autoId = `lbi-${useId().replace(/:/g, '')}`;
  const id = idProp ?? autoId;

  const [focus, setFocus] = useState(false);
  const [value, setValue] = useState(defaultValue == null ? '' : String(defaultValue));

  /* el hueco mide lo que la etiqueta, así que se mide */
  const lab = useRef<HTMLLabelElement | null>(null);
  const [lw, setLw] = useState(40);
  useLayoutEffect(() => {
    if (lab.current) setLw(lab.current.offsetWidth);
  }, [label]);

  const pinned = type === 'date' || type === 'time';
  const up = focus || value.length > 0 || pinned;

  /* ── dónde va la etiqueta y el hueco que deja ────────────
     Nunca dentro de la curva de la esquina: el hueco tiene que abrirse
     en la parte recta del borde superior. */
  const lx = Math.max(14, r + 4);
  const x0 = Math.max(r * 0.6, lx - 5);
  const x1 = lx + lw * S + 5;
  const a = r - IN;
  const R = W - IN;
  const B = H - IN;
  const mid = W / 2;
  const nm = (x0 + x1) / 2;
  const gapL = `M${nm},${IN} L${x0},${IN}`;
  const gapR = `M${nm},${IN} L${x1},${IN}`;
  const right =
    r > 0
      ? `M${x1},${IN} L${W - r},${IN} A${a},${a} 0 0 1 ${R},${r} L${R},${H - r} A${a},${a} 0 0 1 ${W - r},${B} L${mid},${B}`
      : `M${x1},${IN} L${R},${IN} L${R},${B} L${mid},${B}`;
  const left =
    r > 0
      ? `M${x0},${IN} L${r},${IN} A${a},${a} 0 0 0 ${IN},${r} L${IN},${H - r} A${a},${a} 0 0 0 ${r},${B} L${mid},${B}`
      : `M${x0},${IN} L${IN},${IN} L${IN},${B} L${mid},${B}`;

  return (
    <div ref={wrap} className="lbi" data-up={up} data-focus={focus} data-filled={value.length > 0} data-error={!!error}>
      <div className="lbi-box" style={{ height: H, borderRadius: r, '--lbi-x': `${lx}px` } as CSSProperties}>
        <svg className="lbi-ring" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
          <path d={right} />
          <path d={left} />
          <path className="lbi-gap" d={gapL} pathLength={1} />
          <path className="lbi-gap" d={gapR} pathLength={1} />
        </svg>

        <label className="lbi-label" htmlFor={id} ref={lab}>
          {[...label].map((ch, i) => (
            <span key={i} style={{ '--i': i } as CSSProperties}>
              {ch}
            </span>
          ))}
        </label>

        <input
          {...fieldHints(type, rest.autoComplete, rest.step)}
          {...rest}
          id={id}
          className="lbi-field"
          type={type}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            onValueChange?.(e.target.value);
          }}
          onFocus={(e) => {
            setFocus(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocus(false);
            onBlur?.(e);
          }}
          style={{ paddingInline: lx }}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
        />
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1 px-1 text-label-sm text-error">
          {error}
        </p>
      )}
    </div>
  );
}
