import { createView } from './view.js';
import { createLayers } from './layers.js';
import { createHistory } from './history.js';
import { createStoreClient, createState, serialize, emptyDoc } from './store.js';
import { createBase } from './base.js';
import { createGrid } from './grid.js';
import { createTerrain } from './terrain.js';
import { createFog, revealFn, refogFn } from './fog.js';
import { createInk, inkTool } from './ink.js';
import { createTools, rasterBrushTool, paintTool, isTypingTarget } from './tools.js';
import { createPins, pinTool, selectTool } from './pins.js';
import { PIN_TYPES } from './world.js';
import { createUI, wireTools, wirePinEditor } from './ui.js';

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

const app = { canvas, ctx, view: createView(), layers: createLayers(), history: createHistory(), requestRender, size, setStatus, dpr };

function render() {
  const [w, h] = size();
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, w, h);
  app.layers.draw(ctx, app.view, w, h);
}

function cameraControls() {
  const { view } = app;
  const pos = e => [e.offsetX * dpr(), e.offsetY * dpr()];
  canvas.addEventListener('wheel', e => { e.preventDefault(); const [sx, sy] = pos(e); view.zoomAt(sx, sy, Math.exp(-e.deltaY * 0.0015), ...size()); requestRender(); }, { passive: false });
  let panning = null;
  app.isPanGesture = e => e.button === 1 || app.spaceDown || app.tool === 'pan';
  canvas.addEventListener('pointerdown', e => { if (app.isPanGesture(e)) { panning = pos(e); canvas.setPointerCapture(e.pointerId); canvas.style.cursor = 'grabbing'; } });
  canvas.addEventListener('pointermove', e => { if (!panning) return; const p = pos(e); view.panBy(p[0] - panning[0], p[1] - panning[1]); panning = p; requestRender(); });
  canvas.addEventListener('pointerup', () => { if (panning) canvas.style.cursor = app.tool === 'pan' ? 'grab' : 'crosshair'; panning = null; });
  canvas.addEventListener('dblclick', e => {
    const [sx, sy] = pos(e);
    if (app.pinsLayer?.hitTest(sx, sy, view, ...size())) return;
    const [wx, wz] = view.screenToWorld(sx, sy, ...size()); view.x = wx; view.z = wz; requestRender();
  });
  addEventListener('keydown', e => { if (e.code === 'Space' && !isTypingTarget(e)) { app.spaceDown = true; e.preventDefault(); } if (e.key === '0' && !isTypingTarget(e)) { view.fitWorld(...size()); requestRender(); } });
  addEventListener('keyup', e => { if (e.code === 'Space') app.spaceDown = false; });
  document.getElementById('fit').onclick = () => { view.fitWorld(...size()); requestRender(); };
}

app.markDirty = () => {
  app.state.settings.camera = app.view.toJSON(); app.state.settings.layers = app.layers.settings();
  if (app.loadFailed) { requestRender(); return; }
  app.store.schedule(() => serialize(app.state)); requestRender();
};

/** Rebuilds the layer stack and tools for `state`, replacing whatever was loaded before (used on boot and on Import). */
app.rebuild = function rebuild(state) {
  app.state = state;
  app.layers.list.length = 0;
  app.layers.add(createBase(app.textures));
  app.layers.add(createTerrain(state.terrain, app.textures));
  app.layers.add(createGrid(state.settings));
  app.layers.add(app.tools.cursorLayer);                         // stays last
  const fog = app.layers.insertBefore('cursor', createFog(state.fog, app.textures));
  const ink = app.layers.insertBefore('fog', createInk(state.ink));
  const pins = app.layers.insertBefore('cursor', createPins(state, app.icons));
  app.layers.applySettings(state.settings.layers);
  Object.assign(app.view, state.settings.camera);
  Object.assign(app, { fogLayer: fog, inkLayer: ink, pinsLayer: pins });

  const revealFog = { raster: state.fog, fn: revealFn };          // drawing explores: paint and ink clear fog where they land
  const terrainBrush = rasterBrushTool(app, state.terrain, 'paint', () => { const id = app.tools.options.biome; return () => id; }, () => () => 0, revealFog);
  const fogBrush = rasterBrushTool(app, state.fog, 'fog', () => refogFn, () => revealFn);   // the palette's Fog swatch
  app.tools.register('paint', paintTool(app, terrainBrush, fogBrush));
  app.tools.register('ink', inkTool(app, ink, revealFog));
  app.tools.register('pin', pinTool(app, pins, app.openEditor));
  app.tools.register('select', selectTool(app, pins, app.openEditor));
  app.requestRender();
};

async function boot() {
  setStatus('loading…');
  const { textures, icons } = await loadAssets();
  Object.assign(app, { textures, icons });
  app.store = createStoreClient({ onStatus: s => setStatus({ dirty: 'unsaved', saving: 'saving…', saved: 'saved', error: 'save failed, retrying' }[s], s === 'error' ? 'error' : '') });
  const doc = await app.store.load();
  let state;
  try { state = await createState(doc); }
  catch (e) { setStatus(`could not load save (${e.message}); starting empty — press Save to overwrite, or Import a map`, 'error'); state = await createState(emptyDoc()); app.loadFailed = true; }

  app.tools = createTools(app);
  wirePinEditor(app);                       // sets app.openEditor before pin/select tools are registered by rebuild()
  app.rebuild(state);
  cameraControls();
  createUI(app);
  wireTools(app);

  addEventListener('resize', resize); resize();
  if (app.loadFailed || (!doc.terrain && !doc.pins?.length)) app.view.fitWorld(...size());
  if (!app.loadFailed) setStatus('ready');
  requestRender();
}
boot().catch(e => setStatus(`failed to start: ${e.message}`, 'error'));
export { app };
