import { serialize } from './store.js';
import { pinKeys, pinOps } from './pins.js';
import { PIN_TYPES, BIOMES } from './world.js';

/** Connection status line, in the words the toolbar shows. */
export const statusText = (status, you) => ({
  connecting: 'connecting…',
  connected: `connected as ${you?.name || you?.email || 'you'}`,
  reconnecting: 'reconnecting…',
  offline: 'offline',
}[status] ?? status);

export function createUI(app, sync) {
  const layersEl = document.getElementById('layers');
  function refreshLayers() {
    layersEl.replaceChildren();
    for (const l of app.layers.list) {
      if (l.id === 'cursor') continue;
      const row = document.createElement('div'); row.className = 'layer';
      const eye = Object.assign(document.createElement('input'), { type: 'checkbox', checked: l.visible, title: 'visible' });
      eye.onchange = () => { l.visible = eye.checked; app.markDirty(); };
      const name = document.createElement('span'); name.textContent = l.name;
      const op = Object.assign(document.createElement('input'), { type: 'range', min: 0, max: 1, step: 0.05, value: l.opacity, title: 'opacity' });
      op.oninput = () => { l.opacity = Number(op.value); app.markDirty(); };
      row.append(eye, name, op); layersEl.append(row);
    }
  }

  const undo = document.getElementById('undo'), redo = document.getElementById('redo');
  app.history.onChange = () => { undo.disabled = !app.history.canUndo(); redo.disabled = !app.history.canRedo(); };
  app.history.onChange();

  document.getElementById('export').onclick = async () => {
    const blob = new Blob([JSON.stringify(await serialize(app.state))], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `valheim-map-${new Date().toISOString().slice(0, 10)}.json` });
    a.click(); URL.revokeObjectURL(a.href);
  };
  const presenceEl = document.getElementById('presence');
  /** One coloured chip per other person in the room (you are never listed). */
  function refreshPresence() {
    presenceEl.replaceChildren();
    for (const u of app.presence.others()) {
      const chip = document.createElement('span');
      chip.className = 'chip'; chip.textContent = u.name || u.email;
      chip.title = u.email ?? ''; chip.style.background = u.color ?? '#8a6a3a';
      presenceEl.append(chip);
    }
  }

  sync.onStatus = s => app.setStatus(statusText(s, sync.you), s === 'reconnecting' ? 'error' : '');
  sync.onPresence = users => { app.presence.set(users); refreshPresence(); app.requestRender(); };
  app.setStatus(statusText(sync.status, sync.you));

  refreshLayers(); refreshPresence();
  return { refreshLayers, refreshPresence };
}

/** Returns the rename command for a pin name edit, or null when nothing changed. */
export function renameCommand(pin, before, after) {
  if (after === before) return null;
  pin.name = after;
  return { label: 'rename', ...pinOps.update(pin, { name: after }, { name: before }), undo: () => { pin.name = before; }, redo: () => { pin.name = after; } };
}

/**
 * Leaflet-style popup anchored above the selected pin: rename, toggle checked, delete, deselect.
 * Follows the pin every frame via app.updatePinPopup(), so it tracks pans, zooms and drags.
 * Reads app.pinsLayer live so it stays valid across app.rebuild.
 */
export function wirePinPopup(app) {
  const popup = document.getElementById('pin-popup'), name = document.getElementById('pin-name');
  const check = document.getElementById('pin-check'), del = document.getElementById('pin-delete'), close = document.getElementById('pin-close');
  const selectedPin = () => { const id = app.pinsLayer?.selected; return id ? app.state.pins.find(p => p.id === id) : null; };
  let shownFor = null, before = '';

  app.updatePinPopup = () => {
    const pin = selectedPin();
    if (!pin) { if (!popup.hidden) { popup.hidden = true; shownFor = null; } return; }
    const [sx, sy] = app.view.worldToScreen(pin.x, pin.z, ...app.size());
    popup.style.left = `${sx / app.dpr()}px`; popup.style.top = `${sy / app.dpr()}px`;
    check.textContent = pin.checked ? 'Uncheck' : 'Check'; check.classList.toggle('active', pin.checked);
    if (shownFor !== pin.id) { shownFor = pin.id; before = pin.name; name.value = pin.name; }
    popup.hidden = false;
  };

  const commitName = () => { const pin = selectedPin(); if (!pin) return;
    const cmd = renameCommand(pin, before, name.value); before = name.value;
    if (cmd) { app.history.push(cmd); app.markDirty(); } };
  name.onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') { commitName(); name.blur(); } if (e.key === 'Escape') { name.value = before; name.blur(); } };
  name.onblur = commitName;
  check.onclick = () => { const pin = selectedPin(); if (!pin) return;
    pin.checked = !pin.checked;
    app.history.push({ label: 'check', ...pinOps.update(pin, { checked: pin.checked }, { checked: !pin.checked }), undo: () => { pin.checked = !pin.checked; }, redo: () => { pin.checked = !pin.checked; } }); app.markDirty(); };
  del.onclick = () => { const pin = selectedPin(); if (!pin) return;
    const idx = app.state.pins.indexOf(pin); app.pinsLayer.remove(pin.id);
    app.history.push({ label: 'remove pin', ...pinOps.remove(pin), undo: () => app.state.pins.splice(idx, 0, pin), redo: () => app.pinsLayer.remove(pin.id) }); app.markDirty(); };
  close.onclick = () => { app.pinsLayer.selected = null; app.requestRender(); };

  /** Selects a pin and focuses the name field (used right after placing a pin, on double-click, and on Enter). */
  app.openEditor = pin => { app.pinsLayer.selected = pin.id; app.updatePinPopup(); name.focus(); name.select(); };
  const pinsProxy = { get selected() { return app.pinsLayer?.selected; }, remove(id) { app.pinsLayer.remove(id); } };
  pinKeys(app, pinsProxy, app.openEditor);
}

/** Re-syncs the grid checkbox/spacing inputs from app.state.settings.grid (initial wiring and after Import). */
export function syncGridInputs(app) {
  const gridVisible = document.getElementById('grid-visible'), gridSpacing = document.getElementById('grid-spacing');
  gridVisible.checked = app.state.settings.grid.visible; gridSpacing.value = app.state.settings.grid.spacing;
}

/** Wires the toolbar, biome/pin-type palettes, grid controls and tool option UI. Reads layer objects via app.* so it stays valid across app.rebuild. */
const TOOL_HINTS = {
  pan: 'Drag to pan. Wheel zooms, double-click recentres, 0 fits the world.',
  paint: 'Left drag paints the biome and clears fog. Right or Alt drag erases terrain. The Fog swatch re-fogs an area (right drag reveals). [ ] change brush size.',
  ink: 'Left drag draws and clears fog along the line. Right or Alt drag erases whole strokes.',
};

export function wireTools(app) {
  const gridVisible = document.getElementById('grid-visible'), gridSpacing = document.getElementById('grid-spacing');
  syncGridInputs(app);
  gridVisible.onchange = () => { app.state.settings.grid.visible = gridVisible.checked; app.markDirty(); };
  gridSpacing.onchange = () => { app.state.settings.grid.spacing = Math.max(8, Number(gridSpacing.value) || 64); app.markDirty(); };

  const typesEl = document.getElementById('pin-types');
  // The start pin is fixed at spawn and never placed by hand, so it is not offered in the palette.
  for (const t of PIN_TYPES.filter(t => t !== 'start')) { const b = document.createElement('button'); b.title = t; b.dataset.type = t; const img = document.createElement('img'); img.src = `assets/map/mapicon_${t}.png`; b.append(img); b.onclick = () => app.tools.setOption('pinType', t); typesEl.append(b); }

  app.canvas.addEventListener('pointermove', e => {
    const hit = app.pinsLayer.hitTest(e.offsetX * app.dpr(), e.offsetY * app.dpr(), app.view, ...app.size());
    app.canvas.title = hit ? `${hit.name || hit.type} (${Math.round(hit.x)}, ${Math.round(hit.z)})` : '';
  });

  const inkColor = document.getElementById('ink-color'), inkWidth = document.getElementById('ink-width');
  inkColor.oninput = () => app.tools.setOption('inkColor', inkColor.value);
  inkWidth.oninput = () => app.tools.setOption('inkWidth', Number(inkWidth.value));

  const biomesEl = document.getElementById('biomes');
  // Palette: None, Fog (re-fogs an area, keeping the terrain under it), then the biomes.
  const swatches = [BIOMES[0], { id: 'fog', name: 'Fog' }, ...BIOMES.slice(1)];
  for (const b of swatches) { const btn = document.createElement('button'); btn.textContent = b.name; btn.dataset.biome = b.id; btn.onclick = () => { app.tools.setOption('biome', b.id); btn.blur(); }; biomesEl.append(btn); }

  const brush = document.getElementById('brush'), brushLabel = document.getElementById('brush-label');
  brush.oninput = () => app.tools.setOption('brush', Number(brush.value));
  for (const btn of document.querySelectorAll('#toolbar [data-tool]')) btn.onclick = () => { app.tools.set(btn.dataset.tool); btn.blur(); };
  document.getElementById('undo').onclick = () => { if (app.history.undo()) app.markDirty(); };
  document.getElementById('redo').onclick = () => { if (app.history.redo()) app.markDirty(); };

  app.tools.onChange = () => {
    for (const btn of document.querySelectorAll('#toolbar [data-tool]')) btn.classList.toggle('active', btn.dataset.tool === app.tools.current);
    for (const btn of biomesEl.children) btn.classList.toggle('active', btn.dataset.biome === String(app.tools.options.biome));
    brush.value = app.tools.options.brush; brushLabel.textContent = `${app.tools.options.brush} m`;
    biomesEl.hidden = app.tools.current !== 'paint';
    document.getElementById('tool-hint').textContent = TOOL_HINTS[app.tools.current] ?? '';
    app.canvas.style.cursor = app.tools.current === 'pan' ? 'grab' : 'crosshair';
    document.getElementById('ink-opts').hidden = app.tools.current !== 'ink';
    typesEl.hidden = app.tools.current !== 'pin';
    for (const b of typesEl.children) b.classList.toggle('active', b.dataset.type === app.tools.options.pinType);
  };
  app.tools.onChange(); app.tools.set('paint');
}
