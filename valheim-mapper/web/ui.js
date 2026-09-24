import { BRUSH_SIZES, INK_WIDTHS, INK_COLORS } from './tools.js';
import { serialize } from './store.js';
import { pinKeys, pinOps } from './pins.js';
import { wireCorrection } from './anchor.js';
import { PIN_TYPES, BIOMES } from './world.js';

/** Connection status line, in the words the toolbar shows. */
export const statusText = (status, you) => ({
  connecting: 'connecting…',
  connected: `connected as ${you?.name || you?.email || 'you'}`,
  reconnecting: 'reconnecting…',
  offline: 'offline — reload to sign in again',
}[status] ?? status);

export function createUI(app, sync) {
  const layerBar = document.getElementById('layerbar'), TOGGLABLE = ['fog', 'ink', 'pins', 'presence'];   // terrain and grid are always on
  /** Game-style show/hide checkboxes for the layers worth hiding: fog to peek under it, ink and pins for clutter, friends' cursors. */
  function refreshLayers() {
    layerBar.replaceChildren();
    for (const id of TOGGLABLE) {
      const l = app.layers.list.find(x => x.id === id); if (!l) continue;
      const label = document.createElement('label');
      const box = Object.assign(document.createElement('input'), { type: 'checkbox', checked: l.visible });
      box.onchange = () => { l.visible = box.checked; app.markDirty(); };
      label.append(box, l.name); layerBar.append(label);
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

  sync.onStatus = s => app.setStatus(statusText(s, sync.you), s === 'reconnecting' || s === 'offline' ? 'error' : '');
  sync.onPresence = (users, full) => { app.presence.set(users, { full: !!full }); refreshPresence(); app.requestRender(); };
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
  const check = document.getElementById('pin-check'), del = document.getElementById('pin-delete'), close = document.getElementById('pin-close'), correct = document.getElementById('pin-correct');
  const selectedPin = () => { const id = app.pinsLayer?.selected; return id ? app.state.pins.find(p => p.id === id) : null; };
  let shownFor = null, before = '';

  app.updatePinPopup = () => {
    const pin = selectedPin();
    if (!pin) { if (!popup.hidden) { popup.hidden = true; shownFor = null; } return; }
    const [sx, sy] = app.view.worldToScreen(pin.x, pin.z, ...app.size());
    popup.style.left = `${sx / app.dpr()}px`; popup.style.top = `${sy / app.dpr()}px`;
    check.textContent = pin.checked ? 'Uncheck' : 'Check'; check.classList.toggle('active', pin.checked);
    correct.hidden = !app.tools.editing || !pin.log;
    if (shownFor !== pin.id) { shownFor = pin.id; before = pin.name; name.value = pin.name; }
    popup.hidden = false;
  };

  const commitName = () => { const pin = selectedPin(); if (!pin) return;
    const cmd = renameCommand(pin, before, name.value); before = name.value;
    if (cmd) { app.history.push(cmd); app.markDirty(); } };
  name.onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') { commitName(); name.blur(); } if (e.key === 'Escape') { name.value = before; name.blur(); } };
  name.onblur = commitName;
  check.onclick = () => { const pin = selectedPin(); if (pin) app.pinActions.toggleChecked(pin); };
  del.onclick = () => { const pin = selectedPin(); if (pin) app.pinActions.remove(pin); };
  close.onclick = () => { app.pinsLayer.selected = null; app.requestRender(); };
  wireCorrection(app, correct);

  /** Selects a pin and focuses the name field (used right after placing a pin, on double-click, and on Enter). */
  app.openEditor = pin => { app.pinsLayer.selected = pin.id; app.updatePinPopup(); name.focus(); name.select(); };
  const pinsProxy = { get selected() { return app.pinsLayer?.selected; }, remove(id) { app.pinsLayer.remove(id); } };
  pinKeys(app, pinsProxy, app.openEditor);
}

/** Instant tooltips: any element with a title shows it in a styled tip after a short hover instead of the OS delay. */
export function wireTooltips(delay = 120) {
  const tip = document.getElementById('tooltip'); let timer = 0, target = null;
  const hide = () => { clearTimeout(timer); tip.hidden = true; target = null; };
  addEventListener('mouseover', e => {
    const el = e.target.closest?.('[title], [data-tip]'); if (!el || el === target) return;
    if (el.title) { el.dataset.tip = el.title; el.removeAttribute('title'); }
    hide(); target = el;
    timer = setTimeout(() => {
      const r = el.getBoundingClientRect(); tip.textContent = el.dataset.tip; tip.hidden = false;
      const w = tip.offsetWidth, h = tip.offsetHeight, above = r.top > h + 12;
      tip.style.left = `${Math.max(6, Math.min(innerWidth - w - 6, r.left + r.width / 2 - w / 2))}px`;
      tip.style.top = `${above ? r.top - h - 8 : r.bottom + 8}px`;
    }, delay);
  });
  addEventListener('mouseout', e => { if (target && !target.contains(e.relatedTarget)) hide(); });
  addEventListener('mousedown', hide, true);
}

/** Wires the toolbar, biome/pin-type palettes and tool option UI. Reads layer objects via app.* so it stays valid across app.rebuild. */
export function wireTools(app) {

  const typesEl = document.getElementById('pin-types');
  // The start pin is fixed at spawn and never placed by hand, so it is not offered in the palette.
  const PIN_LABELS = { pin: 'Pin', fire: 'Camp', house: 'House', hammer: 'Crafting', portal: 'Portal', bed: 'Bed', boss: 'Boss', trader: 'Trader', death: 'Death', memorialplace: 'Memorial', ping: 'Ping', shout: 'Shout', randevent: 'Event' };
  for (const t of PIN_TYPES.filter(t => t !== 'start')) { const b = document.createElement('button'); b.title = PIN_LABELS[t] ?? t; b.dataset.type = t; const img = document.createElement('img'); img.src = `assets/map/mapicon_${t}.png`; b.append(img); b.onclick = () => app.tools.setOption('pinType', t); typesEl.append(b); }

  app.canvas.addEventListener('pointermove', e => {
    const hit = app.pinsLayer.hitTest(e.offsetX * app.dpr(), e.offsetY * app.dpr(), app.view, ...app.size());
    app.canvas.title = hit ? `${hit.name || hit.type} (${Math.round(hit.x)}, ${Math.round(hit.z)})` : '';
  });

  const inkColor = document.getElementById('ink-color'), inkWidth = document.getElementById('ink-width'), inkLabel = document.getElementById('ink-label');
  const inkColors = document.getElementById('ink-colors');
  const pickInk = c => { app.tools.options.inkErase = false; app.tools.setOption('inkColor', c); };
  inkColor.oninput = () => pickInk(inkColor.value);
  const eraseBtn = Object.assign(document.createElement('button'), { textContent: 'Erase', title: 'Drag across a line to erase it' }); eraseBtn.id = 'ink-erase';
  eraseBtn.onclick = () => { app.tools.setOption('inkErase', !app.tools.options.inkErase); eraseBtn.blur(); }; inkColors.prepend(eraseBtn);
  for (const c of INK_COLORS) { const b = document.createElement('button'); b.className = 'swatch'; b.style.background = c; b.dataset.color = c; b.title = c; b.onclick = () => { pickInk(c); b.blur(); }; inkColors.insertBefore(b, inkColors.querySelector('.custom')); }
  for (const m of INK_WIDTHS) { const b = document.createElement('button'); b.textContent = `${m} m`; b.dataset.width = m; b.onclick = () => { app.tools.setOption('inkWidth', m); b.blur(); }; inkWidth.append(b); }

  const biomesEl = document.getElementById('biomes');
  // Palette: Fog (re-fogs an area, keeping the terrain under it), then the biomes.
  const swatches = [{ id: 'fog', name: 'Fog' }, ...BIOMES.slice(1)];
  for (const b of swatches) { const btn = document.createElement('button'); btn.textContent = b.name; btn.dataset.biome = b.id; btn.onclick = () => { app.tools.setOption('biome', b.id); btn.blur(); }; biomesEl.append(btn); }

  const brush = document.getElementById('brush'), brushLabel = document.getElementById('brush-label');
  for (const m of BRUSH_SIZES) { const b = document.createElement('button'); b.textContent = `${m} m`; b.dataset.brush = m; b.onclick = () => { app.tools.setOption('brush', m); app.tools.setOption('fill', false); b.blur(); }; brush.append(b); }
  const fillBtn = Object.assign(document.createElement('button'), { textContent: 'Fill', title: 'Fill an enclosed area (G)' }); fillBtn.dataset.brush = 'fill';
  fillBtn.onclick = () => { app.tools.setOption('fill', true); fillBtn.blur(); }; brush.append(fillBtn);
  for (const btn of document.querySelectorAll('#toolbar [data-tool]')) btn.onclick = () => { app.tools.set(btn.dataset.tool); btn.blur(); };
  const editBtn = document.getElementById('edit');
  editBtn.onclick = () => { app.tools.setEditing(!app.tools.editing); editBtn.blur(); };
  document.getElementById('undo').onclick = () => { if (app.history.undo()) app.markDirty(); };
  document.getElementById('redo').onclick = () => { if (app.history.redo()) app.markDirty(); };

  app.tools.onChange = () => {
    const { editing } = app.tools;
    editBtn.classList.toggle('active', editing); editBtn.textContent = editing ? 'Done' : 'Edit';
    document.body.classList.toggle('editing', editing);
    for (const el of document.querySelectorAll('#toolbar [data-edit]')) el.hidden = !editing;
    for (const btn of document.querySelectorAll('#toolbar [data-tool]')) btn.classList.toggle('active', btn.dataset.tool === app.tools.current);
    for (const btn of biomesEl.children) btn.classList.toggle('active', btn.dataset.biome === String(app.tools.options.biome));
    const { fill } = app.tools.options;
    for (const b of brush.children) b.classList.toggle('active', b.dataset.brush === 'fill' ? fill : !fill && Number(b.dataset.brush) === app.tools.options.brush);
    brushLabel.textContent = fill ? 'click inside an enclosed area' : `${app.tools.options.brush} m radius`;
    for (const b of inkWidth.children) b.classList.toggle('active', Number(b.dataset.width) === app.tools.options.inkWidth);
    inkLabel.textContent = `${app.tools.options.inkWidth} m`;
    const color = app.tools.options.inkColor, erase = app.tools.options.inkErase; let preset = false;
    for (const b of inkColors.querySelectorAll('.swatch')) { const on = !erase && b.dataset.color === color; b.classList.toggle('active', on); preset ||= on; }
    inkColors.querySelector('.custom').classList.toggle('active', !erase && !preset); inkColor.value = color;
    eraseBtn.classList.toggle('active', erase);
    document.getElementById('paint-opts').hidden = app.tools.current !== 'paint';
    app.restCursor?.();
    document.getElementById('ink-opts').hidden = app.tools.current !== 'ink';
    document.getElementById('log-opts').hidden = app.tools.current !== 'log';
    document.getElementById('measure-opts').hidden = app.tools.current !== 'measure';
    if (app.tools.current === 'log') app.logTool?.update();   // refresh the start/summary when the tool is picked
    document.getElementById('sidebar').hidden = !document.querySelector('#sidebar .tool-group:not([hidden])');
    for (const b of typesEl.children) b.classList.toggle('active', b.dataset.type === app.tools.options.pinType);
  };
  app.tools.setEditing(false);   // open read-only: editing is a deliberate step
}

/** The Measure sidebar: distance heading plus a time-per-gait table. Returns the panel object measureTool() expects. */
export function wireMeasurePanel(app) {
  const label = document.getElementById('measure-label'), body = document.querySelector('#measure-table tbody');
  const panel = { setSummary(s) {
    label.textContent = s ? s.label : 'click two or more points';
    body.replaceChildren(...(s?.rows ?? []).map(r => { const tr = document.createElement('tr'); for (const t of [r.note ? `${r.name} (${r.note})` : r.name, `${r.mps} m/s`, r.time]) { const td = document.createElement('td'); td.textContent = t; tr.append(td); } return tr; }));
  } };
  document.getElementById('measure-clear').onclick = e => { app.measureTool?.clear(); e.currentTarget.blur(); };
  addEventListener('keydown', e => { if (e.key === 'Escape' && app.tools.current === 'measure') app.measureTool?.clear(); });
  panel.setSummary(null);
  return panel;
}

/** The Leg log sidebar: text in, live summary out. Returns the panel object logTool() expects. */
export function wireLogPanel(app) {
  const text = document.getElementById('log-text'), summary = document.getElementById('log-summary'), start = document.getElementById('log-start'), place = document.getElementById('log-place');
  const panel = {
    text: () => text.value,
    setSummary: s => { summary.textContent = s; place.disabled = !app.logTool?.walk || app.logTool.errors.length > 0; },
    setStart: s => { start.textContent = s; },
    clear: () => { text.value = ''; },
  };
  text.oninput = () => app.logTool?.update();
  place.onclick = () => { app.logTool?.place(); place.blur(); };
  document.getElementById('log-clear').onclick = () => { panel.clear(); app.logTool?.update(); };
  text.addEventListener('keydown', e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); app.logTool?.place(); } });
  return panel;
}
