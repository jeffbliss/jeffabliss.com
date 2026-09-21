import { createView } from './view.js';
import { createLayers } from './layers.js';
import { createHistory } from './history.js';
import { createStoreClient, createState, serialize, emptyDoc } from './store.js';
import { createBase } from './base.js';
import { PIN_TYPES } from './world.js';

export const loadImage = url => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error(url)); i.src = url; });

async function loadAssets() {
  const names = ['background', 'space', 'forest', 'mountain', 'water', 'fog_layer', 'clouds'];
  const textures = Object.fromEntries(await Promise.all(names.map(async n => [n === 'fog_layer' ? 'fog' : n, await loadImage(`assets/map/${n}.png`)])));
  const iconNames = [...PIN_TYPES, 'checked', 'player_32'];
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
  canvas.addEventListener('pointerdown', e => { if (app.isPanGesture(e)) { panning = pos(e); canvas.setPointerCapture(e.pointerId); } });
  canvas.addEventListener('pointermove', e => { if (!panning) return; const p = pos(e); view.panBy(p[0] - panning[0], p[1] - panning[1]); panning = p; requestRender(); });
  canvas.addEventListener('pointerup', () => { panning = null; });
  canvas.addEventListener('dblclick', e => { const [sx, sy] = pos(e); const [wx, wz] = view.screenToWorld(sx, sy, ...size()); view.x = wx; view.z = wz; requestRender(); });
  addEventListener('keydown', e => { if (e.code === 'Space' && e.target === document.body) { app.spaceDown = true; e.preventDefault(); } if (e.key === '0' && e.target === document.body) { view.fitWorld(...size()); requestRender(); } });
  addEventListener('keyup', e => { if (e.code === 'Space') app.spaceDown = false; });
  document.getElementById('fit').onclick = () => { view.fitWorld(...size()); requestRender(); };
}

async function boot() {
  setStatus('loading…');
  const { textures, icons } = await loadAssets();
  Object.assign(app, { textures, icons });
  app.store = createStoreClient({ onStatus: s => setStatus({ dirty: 'unsaved', saving: 'saving…', saved: 'saved', error: 'save failed, retrying' }[s], s === 'error' ? 'error' : '') });
  let doc = await app.store.load();
  try { app.state = await createState(doc); } catch (e) { setStatus(`could not load save (${e.message}); starting empty`, 'error'); app.state = await createState(emptyDoc()); app.loadFailed = true; }
  Object.assign(app.view, app.state.settings.camera);
  app.layers.add(createBase(textures));
  app.layers.applySettings(app.state.settings.layers);
  cameraControls();
  addEventListener('resize', resize); resize();
  if (!doc.terrain && !doc.pins?.length) app.view.fitWorld(...size());
  if (!app.loadFailed) setStatus('ready');
  requestRender();
}
boot().catch(e => setStatus(`failed to start: ${e.message}`, 'error'));
export { app };
