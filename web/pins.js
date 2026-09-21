import { isTypingTarget } from './tools.js';

export function nearestPin(pins, x, z, maxDist) {
  let best = null, bd = maxDist;
  for (const p of pins) { const d = Math.hypot(p.x - x, p.z - z); if (d <= bd) { bd = d; best = p; } }
  return best;
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
      const [px, py] = view.worldToScreen(state.player.x, state.player.z, w, h);
      if (Math.hypot(px - sx, py - sy) <= r) return 'player';
      const [wx, wz] = view.screenToWorld(sx, sy, w, h);
      return nearestPin(state.pins, wx, wz, r / view.scale);
    },
    draw(ctx, view, w, h) {
      const base = ctx.globalAlpha;
      const dpr = window.devicePixelRatio || 1, s = ICON * dpr;
      ctx.font = `bold ${Math.round(13 * dpr)}px Norse`; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.lineWidth = 3 * dpr; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.fillStyle = '#f3e9d2';
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
      const [px, py] = view.worldToScreen(state.player.x, state.player.z, w, h);
      ctx.save(); ctx.translate(px, py); ctx.rotate(state.player.angle);
      ctx.drawImage(icons.player_32, -s / 2, -s / 2, s, s); ctx.restore();
      if (layer.selected === 'player') { ctx.beginPath(); ctx.arc(px, py, s * 0.6, 0, Math.PI * 2); ctx.strokeStyle = '#ffd77a'; ctx.lineWidth = 2 * dpr; ctx.stroke(); }
    },
  };
  return layer;
}

function dragHandler(app, pins, state) {
  let target = null, start = null, orig = null;
  return {
    begin(hit, wx, wz) { target = hit; start = [wx, wz]; orig = hit === 'player' ? { ...state.player } : { x: hit.x, z: hit.z }; pins.selected = hit === 'player' ? 'player' : hit.id; },
    move(wx, wz) {
      if (!target) return; const dx = wx - start[0], dz = wz - start[1];
      const o = target === 'player' ? state.player : target; o.x = orig.x + dx; o.z = orig.z + dz;
    },
    end() {
      if (!target) return; const o = target === 'player' ? state.player : target, after = { x: o.x, z: o.z }, before = { x: orig.x, z: orig.z };
      if (after.x !== before.x || after.z !== before.z) {
        app.history.push({ label: 'move', undo: () => Object.assign(o, before), redo: () => Object.assign(o, after) }); app.markDirty();
      }
      target = null;
    },
  };
}

export function selectTool(app, pins, openEditor) {
  const drag = dragHandler(app, pins, app.state);
  return {
    down(e, wx, wz, sx, sy) { const hit = pins.hitTest(sx, sy, app.view, ...app.size()); if (hit && !hit.fixed) drag.begin(hit, wx, wz); else pins.selected = null; },
    move(e, wx, wz) { drag.move(wx, wz); },
    up(e) { drag.end(); if (e.detail === 2 && pins.selected && pins.selected !== 'player') openEditor(app.state.pins.find(p => p.id === pins.selected)); },
  };
}

export function pinTool(app, pins, openEditor) {
  const drag = dragHandler(app, pins, app.state);
  return {
    down(e, wx, wz, sx, sy) {
      const hit = pins.hitTest(sx, sy, app.view, ...app.size());
      if (hit) { if (!hit.fixed) drag.begin(hit, wx, wz); return; }   // fixed pins (start) are not draggable and block placement
      if (e.button === 2) return;
      const pin = pins.add({ x: wx, z: wz, type: app.tools.options.pinType });
      pins.selected = pin.id;
      app.history.push({ label: 'add pin', undo: () => pins.remove(pin.id), redo: () => { app.state.pins.push(pin); } });
      app.markDirty(); openEditor(pin);
    },
    move(e, wx, wz) { drag.move(wx, wz); },
    up() { drag.end(); },
  };
}

/** Keyboard actions on the selected pin: Enter rename, X toggle checked, Delete/Backspace remove. */
export function pinKeys(app, pins, openEditor) {
  addEventListener('keydown', e => {
    if (isTypingTarget(e) || !pins.selected || pins.selected === 'player') return;
    const pin = app.state.pins.find(p => p.id === pins.selected); if (!pin) return;
    if (e.key === 'Enter') openEditor(pin);
    else if (e.key.toLowerCase() === 'x') { pin.checked = !pin.checked; app.history.push({ label: 'check', undo: () => { pin.checked = !pin.checked; }, redo: () => { pin.checked = !pin.checked; } }); app.markDirty(); }
    else if (e.key === 'Delete' || e.key === 'Backspace') {
      const idx = app.state.pins.indexOf(pin); pins.remove(pin.id);
      app.history.push({ label: 'remove pin', undo: () => app.state.pins.splice(idx, 0, pin), redo: () => pins.remove(pin.id) }); app.markDirty();
    } else return;
    e.preventDefault();
  });
}
