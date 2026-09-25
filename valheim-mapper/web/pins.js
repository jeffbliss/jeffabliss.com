import { isTypingTarget } from './tools.js';
import { region, estimate, contributing } from './sight.js';

export function nearestPin(pins, x, z, maxDist) {
  let best = null, bd = maxDist;
  for (const p of pins) { const d = Math.hypot(p.x - x, p.z - z); if (d <= bd) { bd = d; best = p; } }
  return best;
}

/** Plain copy of a pin without transient/local-only fields (e.g. `fixed`), for sync ops. */
function plainPin(p) { return { id: p.id, x: p.x, z: p.z, type: p.type, name: p.name, checked: p.checked, ...(p.log ? { log: p.log } : {}), ...(p.sightings?.length ? { sightings: p.sightings } : {}) }; }

export const pinOps = {
  add: pin => ({ ops: [{ type: 'pin.add', pin: plainPin(pin) }], inverseOps: [{ type: 'pin.remove', id: pin.id }] }),
  remove: pin => ({ ops: [{ type: 'pin.remove', id: pin.id }], inverseOps: [{ type: 'pin.add', pin: plainPin(pin) }] }),
  update: (pin, patch, before) => ({ ops: [{ type: 'pin.update', id: pin.id, patch }], inverseOps: [{ type: 'pin.update', id: pin.id, patch: before }] }),
};

/** Everything the map draws for a pin's sightings: contributing wedges, the overlap polygon, and the estimate (or null). */
export function sightingGeometry(pin, pins) {
  const wedges = contributing(pin.sightings, pins).map(s => ({ observer: s.observer, bearing: s.bearing }));
  const r = region(pin.sightings, pins);
  return { wedges, polygon: r.polygon, estimate: estimate(r) };
}

export function createPins(state, icons) {
  const ICON = 32, HIT = 14;
  const layer = {
    id: 'pins', name: 'Pins', selected: null,
    add({ x, z, type, name = '' }) { const pin = { id: crypto.randomUUID(), x, z, type, name, checked: false }; state.pins.push(pin); return pin; },
    remove(id) { const i = state.pins.findIndex(p => p.id === id && !p.fixed); if (i >= 0) state.pins.splice(i, 1); if (layer.selected === id) layer.selected = null; },
    update(id, patch) { const p = state.pins.find(p => p.id === id); if (p) Object.assign(p, patch); return p; },
    hitTest(sx, sy, view, w, h) {
      const dpr = window.devicePixelRatio || 1, r = HIT * dpr;
      const [wx, wz] = view.screenToWorld(sx, sy, w, h);
      return nearestPin(state.pins, wx, wz, r / view.scale);
    },
    draw(ctx, view, w, h) {
      const base = ctx.globalAlpha;
      const dpr = window.devicePixelRatio || 1, s = ICON * dpr;
      ctx.font = `bold ${Math.round(17 * dpr)}px Norse`; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.lineWidth = 3 * dpr; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.fillStyle = '#f3e9d2';
      const sel = layer.selected ? state.pins.find(p => p.id === layer.selected) : null;
      if (sel?.sightings?.length) drawSightings(ctx, view, w, h, sel, state.pins, dpr);
      for (const p of state.pins) {
        const [sx, sy] = view.worldToScreen(p.x, p.z, w, h);
        if (sx < -s || sy < -s || sx > w + s || sy > h + s) continue;
        const icon = icons[p.type] ?? icons.pin;
        ctx.globalAlpha = base * (p.checked ? 0.6 : 1);
        ctx.drawImage(icon, sx - s / 2, sy - s / 2, s, s);
        if (p.checked) ctx.drawImage(icons.checked, sx - s / 2, sy - s / 2, s, s);
        if (p.id === layer.selected) { ctx.beginPath(); ctx.arc(sx, sy, s * 0.6, 0, Math.PI * 2); ctx.strokeStyle = '#ffd77a'; ctx.lineWidth = 2 * dpr; ctx.stroke(); ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.lineWidth = 3 * dpr; }
        const label = p.name || (p.fixed ? 'Start' : '');
        if (label) { ctx.strokeText(label, sx, sy + s / 2); ctx.fillText(label, sx, sy + s / 2); }
      }
      ctx.globalAlpha = base;
    },
  };
  return layer;
}

// Draws the selected pin's contributing wedges, overlap polygon and estimate. Bearing 0 = +z;
// each fan's far edge is 2.5 km, past the 4 km region square's reach from any observer in practice, and clipped by the canvas.
function drawSightings(ctx, view, w, h, pin, pins, dpr) {
  const { wedges, polygon, estimate: est } = sightingGeometry(pin, pins);
  const P = (x, z) => view.worldToScreen(x, z, w, h), rad = d => d * Math.PI / 180, FAR = 2500;
  ctx.save();
  ctx.fillStyle = 'rgba(255, 215, 122, 0.12)'; ctx.strokeStyle = 'rgba(255, 215, 122, 0.6)'; ctx.lineWidth = 1 * dpr;
  for (const { observer, bearing } of wedges) {
    const l = [observer.x + FAR * Math.sin(rad(bearing - 11.25)), observer.z + FAR * Math.cos(rad(bearing - 11.25))];
    const r = [observer.x + FAR * Math.sin(rad(bearing + 11.25)), observer.z + FAR * Math.cos(rad(bearing + 11.25))];
    ctx.beginPath(); ctx.moveTo(...P(observer.x, observer.z)); ctx.lineTo(...P(...l)); ctx.lineTo(...P(...r)); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  if (polygon.length >= 3) {
    ctx.fillStyle = 'rgba(255, 215, 122, 0.35)'; ctx.strokeStyle = '#ffd77a'; ctx.lineWidth = 2 * dpr;
    ctx.beginPath(); polygon.forEach(([x, z], i) => { const [sx, sy] = P(x, z); i ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy); }); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  if (est) {
    const [sx, sy] = P(est.x, est.z), s = 6 * dpr;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2 * dpr;
    ctx.beginPath(); ctx.moveTo(sx - s, sy); ctx.lineTo(sx + s, sy); ctx.moveTo(sx, sy - s); ctx.lineTo(sx, sy + s); ctx.stroke();
  }
  ctx.restore();
}

function dragHandler(app, pins) {
  let target = null, start = null, orig = null;
  return {
    begin(hit, wx, wz) { target = hit; start = [wx, wz]; orig = { x: hit.x, z: hit.z }; pins.selected = hit.id; },
    move(wx, wz) {
      if (!target) return; const dx = wx - start[0], dz = wz - start[1];
      target.x = orig.x + dx; target.z = orig.z + dz;
    },
    end() {
      if (!target) return; const o = target, after = { x: o.x, z: o.z }, before = { x: orig.x, z: orig.z };
      if (after.x !== before.x || after.z !== before.z) {
        app.history.push({ label: 'move', ...pinOps.update(o, after, before), undo: () => Object.assign(o, before), redo: () => Object.assign(o, after) }); app.markDirty();
      }
      target = null;
    },
  };
}

/** Select tool: drags pins; dragging on empty map draws a marquee, kept in app.selection (world rect) for copy. */
export function selectTool(app, pins, openEditor) {
  const drag = dragHandler(app, pins);
  let box = null;
  const rect = () => ({ x0: Math.min(box[0], box[2]), z0: Math.min(box[1], box[3]), x1: Math.max(box[0], box[2]), z1: Math.max(box[1], box[3]) });
  return {
    down(e, wx, wz, sx, sy) {
      const hit = pins.hitTest(sx, sy, app.view, ...app.size());
      if (hit && !hit.fixed) drag.begin(hit, wx, wz); else { pins.selected = null; box = [wx, wz, wx, wz]; app.selection = null; }
    },
    move(e, wx, wz) { if (box) { box[2] = wx; box[3] = wz; app.selection = rect(); } else drag.move(wx, wz); },
    up(e) {
      if (box) { const r = rect(); if ((r.x1 - r.x0) * app.view.scale < 4 || (r.z1 - r.z0) * app.view.scale < 4) app.selection = null; box = null; }
      drag.end(); if (e.detail === 2 && pins.selected) openEditor(app.state.pins.find(p => p.id === pins.selected));
    },
  };
}

/** Pin edits shared by the popup, the keyboard and the map gestures. Each is one synced, undoable command. */
export function pinActions(app) {
  const layer = () => app.pinsLayer;
  return {
    place(x, z, type = app.tools.options.pinType) {
      const pin = layer().add({ x: +x.toFixed(1), z: +z.toFixed(1), type });
      layer().selected = pin.id;
      app.history.push({ label: 'add pin', ...pinOps.add(pin), undo: () => layer().remove(pin.id), redo: () => { app.state.pins.push(pin); } });
      app.markDirty(); return pin;
    },
    toggleChecked(pin) {
      pin.checked = !pin.checked;
      app.history.push({ label: 'check', ...pinOps.update(pin, { checked: pin.checked }, { checked: !pin.checked }), undo: () => { pin.checked = !pin.checked; }, redo: () => { pin.checked = !pin.checked; } });
      app.markDirty();
    },
    remove(pin) {
      if (pin.fixed) return false;
      const idx = app.state.pins.indexOf(pin); layer().remove(pin.id);
      app.history.push({ label: 'remove pin', ...pinOps.remove(pin), undo: () => app.state.pins.splice(idx, 0, pin), redo: () => layer().remove(pin.id) });
      app.markDirty(); return true;
    },
  };
}

/** Keyboard actions on the selected pin: Enter rename, X toggle checked, Delete/Backspace remove. */
export function pinKeys(app, pins, openEditor) {
  addEventListener('keydown', e => {
    if (isTypingTarget(e) || !pins.selected) return;
    const pin = app.state.pins.find(p => p.id === pins.selected); if (!pin) return;
    if (e.key === 'Enter') openEditor(pin);
    else if (e.key.toLowerCase() === 'x') app.pinActions.toggleChecked(pin);
    else if (e.key === 'Delete' || e.key === 'Backspace') { if (!app.pinActions.remove(pin)) return; }   // the start pin cannot be removed
    else return;
    e.preventDefault();
  });
}
