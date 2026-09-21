import { SPEEDS, JOG_MPS } from './world.js';

/** Largest 1 / 2 / 5 × 10ⁿ metres that fits in maxPx at pxPerM CSS pixels per metre. */
export function niceDistance(pxPerM, maxPx = 140) {
  const maxM = maxPx / pxPerM, p = 10 ** Math.floor(Math.log10(maxM));
  for (const k of [5, 2, 1]) if (k * p <= maxM) return k * p;
  return p;
}
export const fmtDistance = m => m >= 1000 ? `${+(m / 1000).toFixed(1)} km` : `${m} m`;
export const fmtTime = s => s < 60 ? `${Math.round(s)} s` : s < 3600 ? `${+(s / 60).toFixed(1)} min` : `${+(s / 3600).toFixed(1)} h`;

/** What the scale bar shows for the current zoom: bar length, distance label, jog time and the per-gait table. */
export function scaleBarInfo(pxPerM, maxPx = 140) {
  const metres = niceDistance(pxPerM, maxPx);
  return {
    metres, px: metres * pxPerM, label: fmtDistance(metres), jog: fmtTime(metres / JOG_MPS),
    rows: SPEEDS.map(s => ({ ...s, time: fmtTime(metres / s.mps) })),
  };
}

/** Binds the #scale element to a view: call update() after every render. */
export function createScaleBar(el, getPxPerM) {
  const bar = el.querySelector('.bar'), dist = el.querySelector('.dist'), jog = el.querySelector('.jog'), body = el.querySelector('tbody');
  let last = null;
  return { update() {
    const info = scaleBarInfo(getPxPerM());
    if (last && last.metres === info.metres && Math.abs(last.px - info.px) < 0.5) return;
    last = info;
    bar.style.width = `${info.px}px`; dist.textContent = info.label; jog.textContent = `${info.jog} jog`;
    body.replaceChildren(...info.rows.map(r => { const tr = document.createElement('tr'); for (const t of [r.name, `${r.mps} m/s`, r.time]) { const td = document.createElement('td'); td.textContent = t; tr.append(td); } return tr; }));
  } };
}
