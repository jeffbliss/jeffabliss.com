import { serialize, createState, emptyDoc } from './store.js';
import { pinKeys } from './pins.js';
import { PIN_TYPES, BIOMES } from './world.js';

export function createUI(app) {
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

  /** Swap in a fresh state (Import / New map): save the old one first, rebuild layers, reset history and UI. */
  async function replaceState(state, statusText) {
    const savedOk = await app.store.flush({ maxAttempts: 2 });
    if (!savedOk) app.setStatus('previous map could not be saved to the server; kept a local copy', 'error');
    app.rebuild(state); app.history.clear(); app.loadFailed = false;
    syncGridInputs(app); app.tools.onChange();
    app.markDirty(); refreshLayers();
    app.setStatus(statusText);
  }

  document.getElementById('new-map').onclick = async () => {
    if (!confirm('Start a new map? This clears terrain, fog, ink and pins and overwrites the saved map. Export first if you want to keep the current one.')) return;
    try {
      await replaceState(await createState(emptyDoc()), 'new map');
      app.view.fitWorld(...app.size()); app.markDirty();
    } catch (err) { app.setStatus(`reset failed: ${err.message}`, 'error'); }
  };

  document.getElementById('save').onclick = () => {
    if (app.loadFailed) {
      if (!confirm('The saved map could not be read. Overwrite it with the current (empty) map?')) return;
      app.loadFailed = false;
    }
    app.markDirty(); app.store.flush({ maxAttempts: 3 });
  };
  document.getElementById('export').onclick = async () => {
    const blob = new Blob([JSON.stringify(await serialize(app.state))], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `valheim-map-${new Date().toISOString().slice(0, 10)}.json` });
    a.click(); URL.revokeObjectURL(a.href);
  };
  document.getElementById('import').onchange = async e => {
    const file = e.target.files[0]; if (!file) return;
    if (!confirm(`Replace the current map with ${file.name}? The current map is saved first.`)) { e.target.value = ''; return; }
    try {
      await replaceState(await createState(JSON.parse(await file.text())), `imported ${file.name}`);
    } catch (err) { app.setStatus(`import failed: ${err.message}`, 'error'); }
    finally { e.target.value = ''; }
  };
  addEventListener('beforeunload', () => { app.store.flush(); });
  refreshLayers();
  return { refreshLayers };
}

/** Returns the rename command for a pin name edit, or null when nothing changed. */
export function renameCommand(pin, before, after) {
  if (after === before) return null;
  pin.name = after;
  return { label: 'rename', undo: () => { pin.name = before; }, redo: () => { pin.name = after; } };
}

/** Sets up pin-name editing and keyboard shortcuts on the selected pin. Layer-object-free: reads app.pinsLayer live. */
export function wirePinEditor(app) {
  const editor = document.getElementById('pin-editor');
  app.openEditor = function openEditor(pin) {
    const [sx, sy] = app.view.worldToScreen(pin.x, pin.z, ...app.size());
    editor.hidden = false; editor.value = pin.name; editor.style.left = `${sx / app.dpr() - 60}px`; editor.style.top = `${sy / app.dpr() + 20}px`; editor.style.width = '120px';
    editor.focus(); editor.select();
    const before = pin.name;
    let closed = false;
    const done = commit => {
      if (closed) return; closed = true;
      editor.onblur = editor.onkeydown = null;
      editor.hidden = true;
      if (!commit || editor.value === before) return;
      const cmd = renameCommand(pin, before, editor.value);
      if (cmd) { app.history.push(cmd); app.markDirty(); }
    };
    editor.onkeydown = e => { if (e.key === 'Enter') done(true); if (e.key === 'Escape') done(false); e.stopPropagation(); };
    editor.onblur = () => done(true);
  };
  const pinsProxy = { get selected() { return app.pinsLayer?.selected; }, remove(id) { app.pinsLayer.remove(id); } };
  pinKeys(app, pinsProxy, pin => app.openEditor(pin));
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
  pin: 'Click to place a pin and name it. Click a pin to select or drag it; Enter renames, X checks, Delete removes.',
  select: 'Click to select pins, drag to move, double-click to rename. Enter renames, X checks, Delete removes.',
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
