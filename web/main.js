import { createView } from './view.js';
import { createLayers } from './layers.js';
import { createHistory, createStrokeRecorder } from './history.js';
import { createStoreClient, createState, serialize, emptyDoc } from './store.js';
import { createBase } from './base.js';
import { createGrid } from './grid.js';
import { createTerrain } from './terrain.js';
import { createFog, revealFn, refogFn } from './fog.js';
import { createInk, inkTool } from './ink.js';
import { createTools, rasterBrushTool, isTypingTarget } from './tools.js';
import { PIN_TYPES, BIOMES, EXPLORE_RADIUS } from './world.js';

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
  addEventListener('keydown', e => { if (e.code === 'Space' && !isTypingTarget(e)) { app.spaceDown = true; e.preventDefault(); } if (e.key === '0' && !isTypingTarget(e)) { view.fitWorld(...size()); requestRender(); } });
  addEventListener('keyup', e => { if (e.code === 'Space') app.spaceDown = false; });
  document.getElementById('fit').onclick = () => { view.fitWorld(...size()); requestRender(); };
}

async function boot() {
  setStatus('loading…');
  const { textures, icons } = await loadAssets();
  Object.assign(app, { textures, icons });
  app.store = createStoreClient({ onStatus: s => setStatus({ dirty: 'unsaved', saving: 'saving…', saved: 'saved', error: 'save failed, retrying' }[s], s === 'error' ? 'error' : '') });
  app.markDirty = () => { app.state.settings.camera = app.view.toJSON(); app.state.settings.layers = app.layers.settings(); app.store.schedule(() => serialize(app.state)); requestRender(); };
  let doc = await app.store.load();
  try { app.state = await createState(doc); } catch (e) { setStatus(`could not load save (${e.message}); starting empty`, 'error'); app.state = await createState(emptyDoc()); app.loadFailed = true; }
  Object.assign(app.view, app.state.settings.camera);
  app.layers.add(createBase(textures));
  const terrain = app.layers.add(createTerrain(app.state.terrain, textures));
  app.layers.add(createGrid(app.state.settings));
  const gridVisible = document.getElementById('grid-visible'), gridSpacing = document.getElementById('grid-spacing');
  gridVisible.checked = app.state.settings.grid.visible; gridSpacing.value = app.state.settings.grid.spacing;
  gridVisible.onchange = () => { app.state.settings.grid.visible = gridVisible.checked; app.markDirty(); };
  gridSpacing.onchange = () => { app.state.settings.grid.spacing = Math.max(8, Number(gridSpacing.value) || 64); app.markDirty(); };
  app.layers.applySettings(app.state.settings.layers);
  cameraControls();
  app.tools = createTools(app);
  app.tools.register('paint', rasterBrushTool(app, app.state.terrain, 'paint', () => { const id = app.tools.options.biome; return () => id; }, () => () => 0));
  app.layers.add(app.tools.cursorLayer);     // stays last; later tasks insert their layers before it with insertBefore
  const fog = app.layers.insertBefore('cursor', createFog(app.state.fog, textures));
  app.tools.register('fog', rasterBrushTool(app, app.state.fog, 'fog', () => revealFn, () => refogFn));
  const ink = app.layers.insertBefore('fog', createInk(app.state.ink));
  app.tools.register('ink', inkTool(app, ink));
  const inkColor = document.getElementById('ink-color'), inkWidth = document.getElementById('ink-width');
  inkColor.oninput = () => app.tools.setOption('inkColor', inkColor.value);
  inkWidth.oninput = () => app.tools.setOption('inkWidth', Number(inkWidth.value));
  document.getElementById('reveal-player').onclick = () => {
    const rec = createStrokeRecorder(app.state.fog); rec.begin();
    fog.reveal(app.state.player.x, app.state.player.z, EXPLORE_RADIUS);
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
    document.getElementById('biomes').hidden = app.tools.current !== 'paint';
    document.getElementById('reveal-player').hidden = app.tools.current !== 'fog';
    document.getElementById('ink-opts').hidden = app.tools.current !== 'ink';
  };
  app.tools.onChange(); app.tools.set('paint');
  addEventListener('resize', resize); resize();
  if (!doc.terrain && !doc.pins?.length) app.view.fitWorld(...size());
  if (!app.loadFailed) setStatus('ready');
  requestRender();
}
boot().catch(e => setStatus(`failed to start: ${e.message}`, 'error'));
export { app };
