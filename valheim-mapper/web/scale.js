import { SPEEDS, JOG_MPS, ZONE_M } from './world.js';
import { chooseSpacing } from './grid.js';

/** Largest 1 / 2 / 5 × 10ⁿ metres that fits in maxPx at pxPerM CSS pixels per metre. */
export function niceDistance(pxPerM, maxPx = 140) {
  const maxM = maxPx / pxPerM, p = 10 ** Math.floor(Math.log10(maxM));
  for (const k of [5, 2, 1]) if (k * p <= maxM) return k * p;
  return p;
}
/** Largest power-of-two fraction or multiple of a zone (8 m .. 1024 m) that fits in maxPx; 8 m when even that does not. */
export function zoneDistance(pxPerM, maxPx = 200) {
  let m = ZONE_M / 8;
  while (m * 2 <= maxPx / pxPerM && m < ZONE_M * 16) m *= 2;
  return m;
}
const FRACTIONS = { 0.125: '⅛', 0.25: '¼', 0.5: '½' };
export const fmtZones = m => { const z = m / ZONE_M; return z >= 1 ? `${z} zone${z === 1 ? '' : 's'}` : `${FRACTIONS[z] ?? z} zone`; };
export const fmtDistance = m => m >= 1000 ? `${+(m / 1000).toFixed(1)} km` : `${m} m`;
export const fmtTime = s => s < 60 ? `${Math.round(s)} s` : s < 3600 ? `${+(s / 60).toFixed(1)} min` : `${+(s / 3600).toFixed(1)} h`;

/**
 * What the scale bar shows. While the 64 m grid is drawn (devScale = device px per metre, as the grid sees it) the bar
 * spans whole grid squares (or halves/quarters/eighths when zoomed right in); once the grid steps up to km lines it uses round km.
 */
export function scaleBarInfo(pxPerM, devScale = pxPerM) {
  const zones = chooseSpacing(ZONE_M, devScale) === ZONE_M;
  const metres = zones ? zoneDistance(pxPerM) : niceDistance(pxPerM);
  return {
    metres, px: metres * pxPerM, zones,
    label: zones ? `${fmtDistance(metres)} · ${fmtZones(metres)}` : fmtDistance(metres),
    jog: fmtTime(metres / JOG_MPS),
    rows: SPEEDS.map(s => ({ ...s, time: fmtTime(metres / s.mps) })),
  };
}

/** Binds the #scale element to a view: call update() after every render. */
export function createScaleBar(el, getScales) {
  const bar = el.querySelector('.bar'), dist = el.querySelector('.dist'), jog = el.querySelector('.jog'), body = el.querySelector('tbody');
  let last = null;
  return { update() {
    const info = scaleBarInfo(...getScales());
    if (last && last.metres === info.metres && Math.abs(last.px - info.px) < 0.5) return;
    last = info;
    bar.style.width = `${info.px}px`; dist.textContent = info.label; jog.textContent = `${info.jog} jog`;
    body.replaceChildren(...info.rows.map(r => {
      const tr = document.createElement('tr');
      for (const t of [r.note ? `${r.name} (${r.note})` : r.name, `${r.mps} m/s`, r.time]) { const td = document.createElement('td'); td.textContent = t; tr.append(td); }
      return tr;
    }));
  } };
}
