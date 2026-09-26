// Sight flow: from a checked pin, pick a compass point, click the target pin. The target's popup lists its sightings
// and, once the wedges cross, offers Correct to sightings, which reuses the log correction so chains and terrain follow.
import { sightOps } from './sight.js';
import { sightingGeometry, nearestPin, pinOps } from './pins.js';
import { correctionCommand } from './anchor.js';
import { combine } from './history.js';

const POINTS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
const nameOf = (pins, id) => { const p = pins.find(p => p.id === id); return p ? (p.name || (p.fixed ? 'Start' : p.type)) : 'missing pin'; };

/** Appends " ±E m" to a pin name, replacing an existing ±N m. */
export function withError(name, error) {
  const suffix = ` ±${error} m`;
  const base = name.replace(/\s*±\s*\d+\s*m$/, '').trim();
  return `${base.slice(0, Math.max(0, 40 - suffix.length)).trimEnd()}${suffix}`.trim();   // the worker caps names at 40
}

export function wireSighting(app, { sight, bar, list, correctSight, status }) {
  let observer = null, bearing = null, prevOverlay = null;
  const pins = () => app.state.pins;
  const selected = () => { const id = app.pinsLayer?.selected; return id ? pins().find(p => p.id === id) : null; };

  const popup = bar.closest('#pin-popup');
  const stop = () => { observer = null; bearing = null; bar.hidden = true; popup?.classList.remove('targeting'); app.tools.intercept = null; app.tools.overlay = prevOverlay; app.toast(''); app.requestRender(); };

  const place = (e, wx, wz) => {
    if (!observer || bearing === null || e.button !== 0) return false;
    const hit = nearestPin(pins().filter(p => p !== observer && !p.fixed), wx, wz, 14 * app.dpr() / app.view.scale);
    if (!hit) { app.toast('Click a pin', 1500); return true; }
    const cmd = sightOps.sight(hit, observer.id, bearing);
    if (cmd) { app.history.push(cmd); app.markDirty(); }
    app.pinsLayer.selected = hit.id;
    stop(); return true;
  };

  bar.replaceChildren(...POINTS.map((label, i) => { const b = document.createElement('button'); b.textContent = label; b.onclick = () => choose(i * 22.5); return b; }));
  const choose = b => {
    bearing = b; for (const [i, el] of [...bar.children].entries()) el.classList.toggle('active', i * 22.5 === b);
    app.toast(`Click the pin that lies ${POINTS[b / 22.5]} of ${nameOf(pins(), observer.id)} · Esc cancels`, 0);
    popup?.classList.add('targeting');                        // let the click reach a target pin under the popup
    app.tools.intercept = place; app.requestRender();
  };

  sight.onclick = () => {
    if (observer) return;
    const pin = selected(); if (!pin?.checked) return;
    observer = pin; bearing = null; bar.hidden = false; prevOverlay = app.tools.overlay;
    app.toast('Pick the compass point, then click the target pin · Esc cancels', 0);
    app.tools.overlay = (ctx, view, w, h) => {
      if (bearing === null) return;
      const rad = d => d * Math.PI / 180, FAR = 2500, P = (x, z) => view.worldToScreen(x, z, w, h);
      const l = [observer.x + FAR * Math.sin(rad(bearing - 11.25)), observer.z + FAR * Math.cos(rad(bearing - 11.25))];
      const r = [observer.x + FAR * Math.sin(rad(bearing + 11.25)), observer.z + FAR * Math.cos(rad(bearing + 11.25))];
      ctx.save(); ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.strokeStyle = '#fff'; ctx.setLineDash([6, 4]); ctx.lineWidth = 1.5 * app.dpr();
      ctx.beginPath(); ctx.moveTo(...P(observer.x, observer.z)); ctx.lineTo(...P(...l)); ctx.lineTo(...P(...r)); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    };
    app.requestRender();
  };

  correctSight.onclick = () => {
    const pin = selected(); if (!pin || pin.fixed) return;
    const { estimate } = sightingGeometry(pin, pins()); if (!estimate) return;
    const target = [+estimate.x.toFixed(1), +estimate.z.toFixed(1)];
    let cmd = correctionCommand(app, pin, target);
    if (!cmd) {
      const before = { x: pin.x, z: pin.z }, after = { x: target[0], z: target[1] };
      Object.assign(pin, after);
      cmd = { label: 'correct to sightings', ...pinOps.update(pin, after, before), undo: () => Object.assign(pin, before), redo: () => Object.assign(pin, after) };
    }
    const nameBefore = pin.name, nameAfter = withError(pin.name, estimate.error);
    pin.name = nameAfter;
    const rename = { ...pinOps.update(pin, { name: nameAfter }, { name: nameBefore }), undo: () => { pin.name = nameBefore; }, redo: () => { pin.name = nameAfter; } };
    app.history.push(combine('correct to sightings', cmd, rename));
    app.markDirty(); app.requestRender();
  };

  addEventListener('keydown', e => { if (e.key === 'Escape' && observer) stop(); });

  /** Called by the popup every frame with the selected pin (or null). */
  let lastKey = null;
  const refresh = pin => {
    if (!pin) { if (observer) stop(); lastKey = null; return; }
    if (observer && pin !== observer) stop();
    sight.hidden = !pin.checked;
    const s = pin.sightings ?? [];
    list.hidden = !s.length;
    const key = pin.id + '|' + s.map(({ from, bearing: b }) => {
      const o = pins().find(p => p.id === from);
      return `${from}:${b}:${o ? (o.checked ? 'checked' : 'unchecked') : 'missing'}:${nameOf(pins(), from)}`;
    }).join(',');
    if (key !== lastKey) {
      lastKey = key;
      if (s.length) list.replaceChildren(...s.map(({ from, bearing: b }) => {
        const row = document.createElement('div'), txt = document.createElement('span'), x = document.createElement('button');
        const o = pins().find(p => p.id === from);
        txt.textContent = `from ${nameOf(pins(), from)}, ${POINTS[b / 22.5]}${o && !o.checked ? ' (unchecked)' : ''}`;
        x.textContent = '×'; x.title = 'Remove this sighting'; x.onclick = () => { const cmd = sightOps.unsight(pin, from); if (cmd) { app.history.push(cmd); app.markDirty(); app.requestRender(); } };
        row.append(txt, x); return row;
      }));
    }
    const g = s.length ? sightingGeometry(pin, pins()) : null;
    const est = g?.estimate ?? null;
    status.hidden = !s.length;
    if (s.length) status.textContent = est ? `estimate ${Math.round(Math.hypot(est.x - pin.x, est.z - pin.z))} m away · ±${est.error} m`
      : g.polygon.length ? 'need another sighting from a different angle' : 'sightings contradict each other';
    correctSight.hidden = !(est && app.tools.editing);
  };
  return { refresh };
}
