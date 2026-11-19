/*!
 * Liquid Glass — refracción (hook de React).
 *
 * Port a React de la directiva de Angular de https://github.com/stormaref/LiquidGlassSkill (MIT), cuyo campo de refracción es
 * a su vez un port del shader de liquid-glass-js (https://github.com/dashersw/liquid-glass-js) — Copyright (c) 2025 Armagan
 * Amcalar, MIT. Permission is hereby granted, free of charge, to any person obtaining a copy of that software to deal in it
 * without restriction, provided this notice travels with it; it is provided "as is", without warranty of any kind.
 * Mantén esta cabecera en cualquier copia o port.
 *
 * Idea: un mapa de desplazamiento (canvas) calculado para el tamaño del elemento alimenta un filtro SVG
 * (feImage → feDisplacementMap → feGaussianBlur) que se usa como `backdrop-filter: url(#filtro)`, de modo que el fondo se
 * curva por el borde del panel como en un cristal. Solo funciona en Chromium (Electron, Chrome y Edge); en el resto el CSS
 * deja su `backdrop-filter: blur(...)` normal. El tinte y el borde de luz son CSS (ver `.liquid-glass` en styles/polish.css).
 */
import { type RefObject, useEffect } from 'react';

export interface LiquidGlassConfig {
  edgeIntensity: number;
  rimIntensity: number;
  baseIntensity: number;
  edgeDistance: number;
  rimDistance: number;
  baseDistance: number;
  cornerBoost: number;
  rippleEffect: number;
  blurRadius: number;
  /** Distorsión del centro; apagada mantiene legible el contenido. */
  warp: boolean;
}

/** Ajuste afinado en los controles de la demo de la librería original. */
const GLASS_PRESET: LiquidGlassConfig = {
  edgeIntensity: 0.015,
  rimIntensity: 0.028,
  baseIntensity: 0.05,
  edgeDistance: 0.5,
  rimDistance: 1.7,
  baseDistance: 0.2,
  cornerBoost: 0.06,
  rippleEffect: 0.26,
  blurRadius: 2,
  warp: false,
};

/** El mapa se pinta al doble del tamaño CSS: la refracción vive en una banda de 1-2 px y a 1x saldría emborronada. */
const SUPERSAMPLE = 2;
/** Tope del lado mayor del mapa (ya supermuestreado), para acotar el coste de cálculo y el tamaño del data-URL. */
const MAX_MAP_EDGE = 1400;
/** stdDeviation del desenfoque SVG por unidad de `blurRadius` (ajustado para igualar el esmerilado de la librería). */
const BLUR_STD_PER_RADIUS = 0.35;

interface FilterEntry {
  id: string;
  node: SVGFilterElement;
  refs: number;
}

const filters = new Map<string, FilterEntry>();
let defs: SVGSVGElement | null = null;
let nextId = 0;

/** `backdrop-filter` con un filtro SVG solo se pinta en Chromium; Safari lo acepta y no pinta nada, así que se decide por motor. */
export function refractionSupported(): boolean {
  if (typeof navigator === 'undefined') return false;
  const brands = (navigator as Navigator & { userAgentData?: { brands: { brand: string }[] } }).userAgentData?.brands;
  if (brands) return brands.some((b) => /Chromium|Google Chrome|Microsoft Edge/i.test(b.brand));
  return /Chrome\//.test(navigator.userAgent);
}

function ensureDefs(): SVGSVGElement {
  if (!defs || !defs.isConnected) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    svg.style.position = 'fixed';
    svg.setAttribute('aria-hidden', 'true');
    svg.appendChild(document.createElementNS(ns, 'defs'));
    document.body.appendChild(svg);
    defs = svg;
  }
  return defs;
}

/** Elementos del mismo tamaño comparten un filtro. */
function acquireFilter(key: string, w: number, h: number, radius: number, pageW: number, pageH: number, cfg: LiquidGlassConfig): FilterEntry {
  let entry = filters.get(key);
  // solo se reutiliza si sigue en el documento: si el <svg> de definiciones se desmontó, su url(#id) ya no resuelve
  if (entry?.node.isConnected) {
    entry.refs++;
    return entry;
  }
  if (entry) filters.delete(key);

  const { mapUrl, scale } = buildDisplacementMap(w, h, radius, pageW, pageH, cfg);
  const id = `liquid-glass-${nextId++}`;
  const ns = 'http://www.w3.org/2000/svg';
  const filter = document.createElementNS(ns, 'filter');
  filter.setAttribute('id', id);
  // la región debe pasar del borde lo que se desplaza el muestreo más el desenfoque, o la refracción se recorta en las esquinas
  const marginPx = scale / 2 + 3 * cfg.blurRadius * BLUR_STD_PER_RADIUS;
  const mx = (marginPx / w) * 100;
  const my = (marginPx / h) * 100;
  filter.setAttribute('x', `${-mx}%`);
  filter.setAttribute('y', `${-my}%`);
  filter.setAttribute('width', `${100 + 2 * mx}%`);
  filter.setAttribute('height', `${100 + 2 * my}%`);
  filter.setAttribute('color-interpolation-filters', 'sRGB');

  const feImage = document.createElementNS(ns, 'feImage');
  feImage.setAttribute('href', mapUrl);
  feImage.setAttribute('x', '0');
  feImage.setAttribute('y', '0');
  feImage.setAttribute('width', String(w));
  feImage.setAttribute('height', String(h));
  feImage.setAttribute('preserveAspectRatio', 'none');
  feImage.setAttribute('result', 'map');

  const feDisplacement = document.createElementNS(ns, 'feDisplacementMap');
  feDisplacement.setAttribute('in', 'SourceGraphic');
  feDisplacement.setAttribute('in2', 'map');
  feDisplacement.setAttribute('scale', String(scale));
  feDisplacement.setAttribute('xChannelSelector', 'R');
  feDisplacement.setAttribute('yChannelSelector', 'G');
  feDisplacement.setAttribute('result', 'displaced');

  const feBlur = document.createElementNS(ns, 'feGaussianBlur');
  feBlur.setAttribute('in', 'displaced');
  feBlur.setAttribute('stdDeviation', String(cfg.blurRadius * BLUR_STD_PER_RADIUS));

  filter.append(feImage, feDisplacement, feBlur);
  ensureDefs().querySelector('defs')!.appendChild(filter);

  entry = { id, node: filter, refs: 1 };
  filters.set(key, entry);
  return entry;
}

function releaseFilter(key: string | null) {
  if (!key) return;
  const entry = filters.get(key);
  if (entry && --entry.refs <= 0) {
    filters.delete(key);
    entry.node.remove();
  }
}

/** Radio computado (px o %) en píxeles CSS. */
function resolveRadius(computed: string, w: number, h: number) {
  const value = parseFloat(computed) || 0;
  return computed.trim().endsWith('%') ? (value / 100) * Math.min(w, h) : value;
}

const clampByte = (v: number) => Math.max(0, Math.min(255, Math.round(v)));

/**
 * Hornea el campo de refracción del shader en un mapa de desplazamiento: R y G codifican el desplazamiento x/y de la
 * muestra en torno al neutro (128), escalado para que los extremos ocupen el `scale` de feDisplacementMap.
 */
function buildDisplacementMap(w: number, h: number, radius: number, pageW: number, pageH: number, cfg: LiquidGlassConfig) {
  // en superficies anchas el supermuestreo baja de 1 (mapa más grueso que feImage estira): casi todo su centro es neutro
  const ss = Math.max(0.25, Math.min(SUPERSAMPLE, MAX_MAP_EDGE / Math.max(w, h)));
  const bw = Math.max(1, Math.round(w * ss));
  const bh = Math.max(1, Math.round(h * ss));
  const r = radius * ss;
  const minDim = Math.min(w, h);
  const dx = new Float32Array(bw * bh);
  const dy = new Float32Array(bw * bh);
  let maxAbs = 0;

  for (let py = 0; py < bh; py++) {
    for (let px = 0; px < bw; px++) {
      const cx = (px + 0.5) / bw;
      const cy = (py + 0.5) / bh;

      // distancia con signo al borde del rectángulo redondeado (de px supermuestreados a px CSS)
      const tx = Math.abs(px + 0.5 - bw / 2) - (bw / 2 - r);
      const ty = Math.abs(py + 0.5 - bh / 2) - (bh / 2 - r);
      const outside = Math.hypot(Math.max(tx, 0), Math.max(ty, 0));
      const inside = Math.min(Math.max(tx, ty), 0);
      const distPx = Math.max(-(outside + inside - r), 0) / ss;

      const edgeFall = Math.exp(-distPx * cfg.edgeDistance);
      const rimFall = Math.exp(-distPx * cfg.rimDistance);
      const baseFall = 1 - Math.exp(-distPx * cfg.baseDistance);
      const baseComponent = cfg.warp ? baseFall * cfg.baseIntensity : 0;
      const total = baseComponent + edgeFall * cfg.edgeIntensity + rimFall * cfg.rimIntensity;

      // la normal del rectángulo redondeado del shader, en coordenadas de textura
      let nx = cx - 0.5;
      let ny = cy - 0.5;
      const len = Math.hypot(nx, ny);
      if (len > 0) {
        nx /= len;
        ny /= len;
      }

      const cornerNorm = Math.max(Math.min(cx, 1 - cx), Math.min(cy, 1 - cy)) * minDim;
      const corner = Math.exp(-cornerNorm * 0.3) * cfg.cornerBoost;
      const ripple = Math.sin((distPx / minDim) * 25) * cfg.rippleEffect * rimFall;

      // normal * (refracción + refuerzo de esquina) + perpendicular * ondulación, de fracciones de la textura a píxeles
      const fx = (nx * (total + corner) - ny * ripple) * pageW;
      const fy = (ny * (total + corner) + nx * ripple) * pageH;

      const i = py * bw + px;
      dx[i] = fx;
      dy[i] = fy;
      maxAbs = Math.max(maxAbs, Math.abs(fx), Math.abs(fy));
    }
  }

  const scale = Math.max(maxAbs * 2, 1e-4);
  // feDisplacementMap decodifica el byte b como scale*(b/255 - 0.5); como 128/255 ≠ 0.5, un neutro ingenuo (128) correría todo
  // el interior scale/510 px. Se resta ese sesgo para que desplazamiento cero se quede quieto.
  const bias = scale * (128 / 255 - 0.5);
  const canvas = document.createElement('canvas');
  canvas.width = bw;
  canvas.height = bh;
  const ctx = canvas.getContext('2d')!;
  const image = ctx.createImageData(bw, bh);
  const data = image.data;
  for (let i = 0; i < bw * bh; i++) {
    data[i * 4] = clampByte(255 * (0.5 + (dx[i] - bias) / scale));
    data[i * 4 + 1] = clampByte(255 * (0.5 + (dy[i] - bias) / scale));
    data[i * 4 + 2] = 128;
    data[i * 4 + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  return { mapUrl: canvas.toDataURL('image/png'), scale };
}

/**
 * Da refracción de cristal líquido al elemento (con la clase `liquid-glass`). Reconstruye el mapa cuando cambia su tamaño o
 * el de la ventana. Si el navegador no lo soporta no hace nada y queda el desenfoque del CSS. `active` permite apagarlo
 * (p. ej. con el panel cerrado) sin desmontar el elemento, y `watch` vuelve a aplicarlo cuando el elemento se sustituye por otro.
 */
export function useLiquidGlass(ref: RefObject<HTMLElement | null>, config?: Partial<LiquidGlassConfig>, active = true, watch: unknown = null) {
  const configKey = JSON.stringify(config ?? {});
  useEffect(() => {
    const host = ref.current;
    if (!host || !active || !refractionSupported()) return;
    const cfg: LiquidGlassConfig = { ...GLASS_PRESET, ...(JSON.parse(configKey) as Partial<LiquidGlassConfig>) };
    let currentKey: string | null = null;
    let frame = 0;
    let debounce: ReturnType<typeof setTimeout> | undefined;

    const rebuild = () => {
      const w = Math.round(host.offsetWidth);
      const h = Math.round(host.offsetHeight);
      if (w < 2 || h < 2) return;
      const radius = Math.min(resolveRadius(getComputedStyle(host).borderTopLeftRadius, w, h), Math.min(w, h) / 2);
      // el shader desplaza en fracciones de la captura de la página: su equivalente en vivo es la ventana
      const pageW = window.innerWidth;
      const pageH = window.innerHeight;
      const key = [w, h, radius, pageW, pageH, configKey].join('|');
      if (key === currentKey) return;
      releaseFilter(currentKey);
      const entry = acquireFilter(key, w, h, radius, pageW, pageH, cfg);
      currentKey = key;
      host.style.backdropFilter = `url(#${entry.id})`;
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(rebuild);
    };
    // cambiar el tamaño de la ventana altera el mapa de todos: se espera a que se asiente antes de recalcular
    const onWindowResize = () => {
      clearTimeout(debounce);
      debounce = setTimeout(schedule, 180);
    };

    const observer = new ResizeObserver(schedule);
    observer.observe(host);
    window.addEventListener('resize', onWindowResize, { passive: true });
    schedule();

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', onWindowResize);
      clearTimeout(debounce);
      cancelAnimationFrame(frame);
      releaseFilter(currentKey);
      host.style.backdropFilter = ''; // vuelve al desenfoque del CSS
    };
  }, [ref, active, configKey, watch]);
}
