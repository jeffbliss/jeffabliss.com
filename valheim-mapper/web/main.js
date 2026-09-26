import { createView } from './view.js';
import { createLayers } from './layers.js';
import { createHistory, createStrokeRecorder } from './history.js';
import { createState, emptyDoc } from './store.js';
import { createGrid } from './grid.js';
import { createTerrainLayer, createFogLayer } from './gl.js';
import { revealFn, refogFn } from './fog.js';
import { createInk, inkTool, INK_REVEAL_MIN_M } from './ink.js';
import { createTools, rasterBrushTool, paintTool, isTypingTarget, interpolate, panGesture } from './tools.js';
import { createPins, selectTool, pinActions } from './pins.js';
import { PIN_TYPES } from './world.js';
import { createUI, wireTools, wirePinPopup, wireLogPanel, wireMeasurePanel, wireTooltips } from './ui.js';
import { createScaleBar } from './scale.js';
import { fillAt } from './fill.js';
import { createClipboard } from './clipboard.js';
import { logTool } from './leglog.js';
import { measureTool } from './measure.js';
import { createSync } from './sync.js';
import { createPresence } from './presence.js';

export const loadImage = url => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error(url)); i.src = url; });

async function loadAssets() {
  const names = ['background', 'space', 'forest', 'mountain', 'water', 'fog_layer', 'clouds'];
  const textures = Object.fromEntries(await Promise.all(names.map(async n => [n === 'fog_layer' ? 'fog' : n, await loadImage(`assets/map/${n}.png`)])));
  const iconNames = [...PIN_TYPES, 'checked'];
  const icons = Object.fromEntries(await Promise.all(iconNames.map(async n => [n, await loadImage(`assets/map/mapicon_${n}.png`)])));
  await Promise.all([document.fonts.load('bold 14px Norse'), document.fonts.load('12px "Averia Serif"')]);
  return { textures, icons };
}

const status = document.getElementById('status');
const setStatus = (s, cls = '') => { status.textContent = s; status.className = cls; };
/** Short on-map notice (fill refusals, paste hints); replaces the previous one. */
const toastEl = document.getElementById('toast'); let toastTimer = 0;
const toast = (msg, ms = 3000) => { toastEl.textContent = msg; toastEl.hidden = !msg; clearTimeout(toastTimer); if (msg && ms) toastTimer = setTimeout(() => { toastEl.hidden = true; }, ms); };

const canvas = document.getElementById('map');
const ctx = canvas.getContext('2d');
const dpr = () => window.devicePixelRatio || 1;
const size = () => [canvas.width, canvas.height];
function resize() { canvas.width = Math.round(innerWidth * dpr()); canvas.height = Math.round(innerHeight * dpr()); requestRender(); }

let needsRender = false;
export function requestRender() {
  if (needsRender) return; needsRender = true;
  requestAnimationFrame(() => { needsRender = false; render(); });
}

const app = { canvas, ctx, view: createView(), layers: createLayers(), history: createHistory(), requestRender, size, setStatus, toast, dpr };
app.pinActions = pinActions(app);
app.presence = createPresence(() => app.you);
const scaleBar = createScaleBar(document.getElementById('scale'), () => [app.view.scale / dpr(), app.view.scale]);   // CSS px/m, device px/m

// Per-browser preferences (layer visibility/opacity, camera). The map itself lives on the server.
const SETTINGS_KEY = 'valheim-mapper:settings';
export function loadSettings() {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || null; } catch { return null; }
}
export function saveSettings(settings) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ layers: settings.layers, camera: settings.camera })); } catch { /* private mode / full quota: preferences are disposable */ }
}

/** Lays the saved preferences over the snapshot's defaults; fits the world when there is no saved camera. */
function applyLocalSettings() {
  const saved = loadSettings();
  if (saved?.layers) { app.state.settings.layers = saved.layers; app.layers.applySettings(saved.layers); }
  if (saved?.camera) Object.assign(app.view, saved.camera); else app.view.fitHome(...size());
  requestRender();
}

function render() {
  const [w, h] = size(); if (!w || !h) return;   // a hidden or not-yet-laid-out tab: nothing to draw, and 0-size layer canvases would throw
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, w, h);
  app.layers.draw(ctx, app.view, w, h);
  app.updatePinPopup?.();
  scaleBar.update();
}

function cameraControls() {
  const { view } = app;
  const pos = e => [e.offsetX * dpr(), e.offsetY * dpr()];
  canvas.addEventListener('wheel', e => { e.preventDefault(); const [sx, sy] = pos(e); view.zoomAt(sx, sy, Math.exp(-e.deltaY * 0.0015), ...size()); requestRender(); }, { passive: false });
  let panning = null, pressed = null;
  app.isPanGesture = e => panGesture(e, { editing: app.tools.editing, tool: app.tools.current, spaceDown: app.spaceDown });
  app.restCursor = () => { canvas.style.cursor = app.tools.editing || app.tools.current === 'measure' ? 'crosshair' : 'grab'; };
  canvas.addEventListener('pointerdown', e => { if (app.tools.intercept && e.button === 0) return; if (app.isPanGesture(e)) { panning = pressed = pos(e); canvas.setPointerCapture(e.pointerId); canvas.style.cursor = 'grabbing'; } });
  canvas.addEventListener('pointermove', e => { if (!panning) return; const p = pos(e); view.panBy(p[0] - panning[0], p[1] - panning[1]); panning = p; requestRender(); });
  const pinAt = (sx, sy) => app.pinsLayer?.hitTest(sx, sy, view, ...size());
  // Pins follow the game's map: click a pin to cross it off, right-click a pin to remove it, double-click to place or open one.
  // A left click while a placement intercept is active (paste, sighting) belongs to that intercept, not to these gestures.
  canvas.addEventListener('pointerup', e => {
    if (!panning) return; panning = null; app.restCursor();
    const [sx, sy] = pos(e), moved = Math.hypot(sx - pressed[0], sy - pressed[1]) > 4 * dpr();
    if (moved) return;
    const hit = pinAt(sx, sy);
    if (e.button === 2 && hit && app.pinActions.remove(hit)) app.toast(`Removed ${hit.name || hit.type} · Cmd/Ctrl+Z to undo`);
    if (e.button === 0 && app.tools.current === 'view') { if (hit) app.pinActions.toggleChecked(hit); else app.pinsLayer.selected = null; }
    requestRender();
  });
  canvas.addEventListener('dblclick', e => {
    if (e.button !== 0) return;
    const [sx, sy] = pos(e), hit = pinAt(sx, sy);
    if (hit) { app.openEditor(hit); return; }
    if (!['view', 'select'].includes(app.tools.current)) return;
    const [wx, wz] = view.screenToWorld(sx, sy, ...size());
    app.openEditor(app.pinActions.place(wx, wz));
  });
  addEventListener('keydown', e => { if (e.code === 'Space' && !isTypingTarget(e)) { app.spaceDown = true; e.preventDefault(); } });
  addEventListener('keyup', e => { if (e.code === 'Space') app.spaceDown = false; });
  // On-map zoom buttons (and +/- keys): zoom about the centre of the view, one step = ×1.5.
  const zoomStep = factor => { const [w, h] = size(); view.zoomAt(w / 2, h / 2, factor, w, h); app.markDirty(); };
  document.getElementById('zoom-in').onclick = e => { zoomStep(1.5); e.currentTarget.blur(); };
  document.getElementById('zoom-out').onclick = e => { zoomStep(1 / 1.5); e.currentTarget.blur(); };
  addEventListener('keydown', e => { if (isTypingTarget(e) || e.metaKey || e.ctrlKey) return; if (e.key === '+' || e.key === '=') zoomStep(1.5); if (e.key === '-' || e.key === '_') zoomStep(1 / 1.5); });
}

app.markDirty = () => {
  app.state.settings.camera = app.view.toJSON(); app.state.settings.layers = app.layers.settings();
  saveSettings(app.state.settings); requestRender();
};

/** Rebuilds the layer stack and tools for `state`, replacing whatever was loaded before (used on boot and on Import). */
app.rebuild = function rebuild(state) {
  app.state = state;
  for (const l of app.layers.list) l.dispose?.();                 // free GPU textures of the previous map
  app.layers.list.length = 0;
  app.layers.add(createTerrainLayer(state.terrain, app.textures));   // parchment, space and painted biomes (WebGL)
  app.layers.add(createGrid());
  app.layers.add(app.tools.cursorLayer);                         // stays last
  const fog = app.layers.insertBefore('cursor', createFogLayer(state.fog, app.textures));
  const ink = app.layers.insertBefore('fog', createInk(state.ink));
  const pins = app.layers.insertBefore('cursor', createPins(state, app.icons));
  app.layers.insertBefore('cursor', app.presence.layer);          // friends' cursors ride above the pins
  app.layers.applySettings(state.settings.layers);
  Object.assign(app.view, state.settings.camera);
  Object.assign(app, { fogLayer: fog, inkLayer: ink, pinsLayer: pins });

  const revealFog = { raster: state.fog, fn: revealFn, layerName: 'fog' };   // drawing explores: paint and ink clear fog where they land
  const terrainBrush = rasterBrushTool(app, state.terrain, 'terrain', () => { const id = app.tools.options.biome; return () => id; }, revealFog);
  const fogBrush = rasterBrushTool(app, state.fog, 'fog', () => refogFn);   // the palette's Fog swatch
  const fill = (wx, wz) => {
    const cmd = fillAt(state, wx, wz, app.tools.options.biome);
    if (cmd.error) { app.toast(cmd.error); return; }
    app.history.push(cmd); app.markDirty();
  };
  app.tools.register('paint', paintTool(app, terrainBrush, fogBrush, fill));
  app.tools.register('ink', inkTool(app, ink, revealFog));
  app.tools.register('select', selectTool(app, pins, app.openEditor));
  // Walking a logged path explores it: reveal fog along the stroke, as the ink tool does.
  const revealInk = stroke => {
    const rec = createStrokeRecorder(state.fog, 'fog'); rec.begin();
    const r = Math.max(INK_REVEAL_MIN_M, stroke.width);
    for (let i = 0; i < stroke.points.length; i++) {
      const [ax, az] = stroke.points[i], [bx, bz] = stroke.points[i + 1] ?? stroke.points[i];
      for (const [x, z] of interpolate(ax, az, bx, bz, r * 0.5)) state.fog.stamp(x, z, r, revealFn);
    }
    return rec.end('leg log');
  };
  app.logTool = logTool(app, app.logPanel, { revealInk });
  app.tools.register('log', app.logTool);
  app.measureTool = measureTool(app, app.measurePanel);
  app.tools.register('measure', app.measureTool);
  app.requestRender();
};

async function boot() {
  setStatus('loading…');
  const { textures, icons } = await loadAssets();
  Object.assign(app, { textures, icons });

  app.tools = createTools(app);
  wirePinPopup(app);                        // sets app.openEditor before pin/select tools are registered by rebuild()
  app.logPanel = wireLogPanel(app);         // likewise for the Log tool
  wireTooltips();
  app.measurePanel = wireMeasurePanel(app);
  app.rebuild(await createState(emptyDoc()));   // an empty map to draw until the server's snapshot arrives
  cameraControls();
  createClipboard(app);                     // marquee selection, copy, paste (after cameraControls: it wraps isPanGesture)
  const sync = createSync(app);             // after createTools: it takes over app.history.onApply
  app.sync = sync;
  const ui = createUI(app, sync);
  wireTools(app);

  // The server owns the document; every (re)connection replaces the local state wholesale.
  app.onSnapshot = async (doc, you) => {
    app.you = you;
    app.rebuild(await createState(doc));
    applyLocalSettings();
    ui.refreshLayers(); ui.refreshPresence();
  };
  app.onPointer = (x, z, tool, brush) => sync.cursor(x, z, tool, brush);

  addEventListener('resize', resize); resize();
  app.view.fitHome(...size());
  sync.connect();
  setInterval(() => { if (app.presence.visible().length) requestRender(); }, 1000);   // so idle cursors fade away
  requestRender();
}
boot().catch(e => setStatus(`failed to start: ${e.message}`, 'error'));
export { app };
