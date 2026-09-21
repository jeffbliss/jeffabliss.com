import { serialize, createState } from './store.js';
import { createStrokeRecorder } from './history.js';
import { pinKeys } from './pins.js';
import { PIN_TYPES, BIOMES, EXPLORE_RADIUS } from './world.js';

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
      op.style.width = '70px'; op.oninput = () => { l.opacity = Number(op.value); app.markDirty(); };
      row.append(eye, name, op); layersEl.append(row);
    }
  }

  const undo = document.getElementById('undo'), redo = document.getElementById('redo');
  app.history.onChange = () => { undo.disabled = !app.history.canUndo(); redo.disabled = !app.history.canRedo(); };
  app.history.onChange();

  document.getElementById('save').onclick = () => { app.markDirty(); app.store.flush(); };
  document.getElementById('export').onclick = async () => {
    const blob = new Blob([JSON.stringify(await serialize(app.state))], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `valheim-map-${new Date().toISOString().slice(0, 10)}.json` });
    a.click(); URL.revokeObjectURL(a.href);
  };
  document.getElementById('import').onchange = async e => {
    const file = e.target.files[0]; if (!file) return;
    if (!confirm(`Replace the current map with ${file.name}? The current map is saved first.`)) return;
    try {
      await app.store.flush();
      const state = await createState(JSON.parse(await file.text()));
      app.rebuild(state); app.history.clear(); app.markDirty(); refreshLayers();
      app.setStatus(`imported ${file.name}`);
    } catch (err) { app.setStatus(`import failed: ${err.message}`, 'error'); }
    e.target.value = '';
  };
  addEventListener('beforeunload', () => { app.store.flush(); });
  refreshLayers();
  return { refreshLayers };
}

/** Sets up pin-name editing and keyboard shortcuts on the selected pin. Layer-object-free: reads app.pinsLayer live. */
export function wirePinEditor(app) {
  const editor = document.getElementById('pin-editor');
  app.openEditor = function openEditor(pin) {
    const [sx, sy] = app.view.worldToScreen(pin.x, pin.z, ...app.size());
    editor.hidden = false; editor.value = pin.name; editor.style.left = `${sx / app.dpr() - 60}px`; editor.style.top = `${sy / app.dpr() + 20}px`; editor.style.width = '120px';
    editor.focus(); editor.select();
    const before = pin.name;
    const done = commit => {
      editor.hidden = true; editor.onblur = editor.onkeydown = null;
      if (!commit || editor.value === before) return;
      const after = editor.value; pin.name = after;
      app.history.push({ label: 'rename', undo: () => { pin.name = before; }, redo: () => { pin.name = after; } }); app.markDirty();
    };
    editor.onkeydown = e => { if (e.key === 'Enter') done(true); if (e.key === 'Escape') done(false); e.stopPropagation(); };
    editor.onblur = () => done(true);
  };
  const pinsProxy = { get selected() { return app.pinsLayer?.selected; }, remove(id) { app.pinsLayer.remove(id); } };
  pinKeys(app, pinsProxy, pin => app.openEditor(pin));
}

/** Wires the toolbar, biome/pin-type palettes, grid controls and tool option UI. Reads layer objects via app.* so it stays valid across app.rebuild. */
export function wireTools(app) {
  const gridVisible = document.getElementById('grid-visible'), gridSpacing = document.getElementById('grid-spacing');
  gridVisible.checked = app.state.settings.grid.visible; gridSpacing.value = app.state.settings.grid.spacing;
  gridVisible.onchange = () => { app.state.settings.grid.visible = gridVisible.checked; app.markDirty(); };
  gridSpacing.onchange = () => { app.state.settings.grid.spacing = Math.max(8, Number(gridSpacing.value) || 64); app.markDirty(); };

  const typesEl = document.getElementById('pin-types');
  for (const t of PIN_TYPES) { const b = document.createElement('button'); b.title = t; b.dataset.type = t; const img = document.createElement('img'); img.src = `assets/map/mapicon_${t}.png`; b.append(img); b.onclick = () => app.tools.setOption('pinType', t); typesEl.append(b); }

  app.canvas.addEventListener('pointermove', e => {
    const hit = app.pinsLayer.hitTest(e.offsetX * app.dpr(), e.offsetY * app.dpr(), app.view, ...app.size());
    app.canvas.title = hit && hit !== 'player' ? `${hit.name || hit.type} (${Math.round(hit.x)}, ${Math.round(hit.z)})` : hit === 'player' ? `player (${Math.round(app.state.player.x)}, ${Math.round(app.state.player.z)})` : '';
  });

  const inkColor = document.getElementById('ink-color'), inkWidth = document.getElementById('ink-width');
  inkColor.oninput = () => app.tools.setOption('inkColor', inkColor.value);
  inkWidth.oninput = () => app.tools.setOption('inkWidth', Number(inkWidth.value));

  document.getElementById('reveal-player').onclick = () => {
    const rec = createStrokeRecorder(app.state.fog); rec.begin();
    app.fogLayer.reveal(app.state.player.x, app.state.player.z, EXPLORE_RADIUS);
    const cmd = rec.end('reveal'); if (cmd) { app.history.push(cmd); app.markDirty(); }
  };

  const biomesEl = document.getElementById('biomes');
  for (const b of BIOMES) { const btn = document.createElement('button'); btn.textContent = b.name; btn.dataset.biome = b.id; btn.onclick = () => { app.tools.setOption('biome', b.id); btn.blur(); }; biomesEl.append(btn); }

  const brush = document.getElementById('brush'), brushLabel = document.getElementById('brush-label');
  brush.oninput = () => app.tools.setOption('brush', Number(brush.value));
  for (const btn of document.querySelectorAll('#toolbar [data-tool]')) btn.onclick = () => { app.tools.set(btn.dataset.tool); btn.blur(); };
  document.getElementById('undo').onclick = () => { app.history.undo(); app.markDirty(); };
  document.getElementById('redo').onclick = () => { app.history.redo(); app.markDirty(); };

  app.tools.onChange = () => {
    for (const btn of document.querySelectorAll('#toolbar [data-tool]')) btn.classList.toggle('active', btn.dataset.tool === app.tools.current);
    for (const btn of biomesEl.children) btn.classList.toggle('active', Number(btn.dataset.biome) === app.tools.options.biome);
    brush.value = app.tools.options.brush; brushLabel.textContent = `${app.tools.options.brush} m`;
    biomesEl.hidden = app.tools.current !== 'paint';
    document.getElementById('reveal-player').hidden = app.tools.current !== 'fog';
    document.getElementById('ink-opts').hidden = app.tools.current !== 'ink';
    typesEl.hidden = app.tools.current !== 'pin';
    for (const b of typesEl.children) b.classList.toggle('active', b.dataset.type === app.tools.options.pinType);
  };
  app.tools.onChange(); app.tools.set('paint');
}
