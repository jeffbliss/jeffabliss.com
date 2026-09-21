import { createStrokeRecorder } from './history.js';

const HOTKEYS = { h: 'pan', b: 'paint', i: 'ink', f: 'fog', p: 'pin', v: 'select' };

export function createTools(app) {
  const handlers = {};
  const tools = { current: 'pan', options: { biome: 1, brush: 64, inkColor: '#2b1d0e', inkWidth: 8, pinType: 'pin' }, onChange: null };
  tools.register = (name, handler) => { handlers[name] = handler; };
  tools.set = name => { if (!handlers[name] && name !== 'pan') return; tools.current = name; app.tool = name; tools.onChange?.(); app.requestRender(); };
  tools.setOption = (k, v) => { tools.options[k] = v; tools.onChange?.(); app.requestRender(); };

  const { canvas, view } = app;
  const pos = e => { const p = [e.offsetX * app.dpr(), e.offsetY * app.dpr()]; return [...p, ...view.screenToWorld(p[0], p[1], ...app.size())]; };
  let active = null;
  tools.pointer = null;                                     // last [sx, sy, wx, wz] for cursor overlays
  canvas.addEventListener('pointerdown', e => {
    if (app.isPanGesture(e)) return;
    const h = handlers[tools.current]; if (!h) return;
    e.preventDefault(); canvas.setPointerCapture(e.pointerId); active = h;
    const [sx, sy, wx, wz] = pos(e); h.down?.(e, wx, wz, sx, sy); app.requestRender();
  });
  canvas.addEventListener('pointermove', e => {
    const p = pos(e); tools.pointer = p;
    if (active) active.move?.(e, p[2], p[3], p[0], p[1]);
    app.requestRender();
  });
  const finish = e => { if (!active) return; const [sx, sy, wx, wz] = pos(e); active.up?.(e, wx, wz, sx, sy); active = null; app.requestRender(); };
  canvas.addEventListener('pointerup', finish); canvas.addEventListener('pointercancel', finish);
  canvas.addEventListener('contextmenu', e => e.preventDefault());

  addEventListener('keydown', e => {
    if (e.target !== document.body) return;
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); (e.shiftKey ? app.history.redo() : app.history.undo()); app.markDirty(); return; }
    if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); app.history.redo(); app.markDirty(); return; }
    if (HOTKEYS[e.key.toLowerCase()] && !mod) tools.set(HOTKEYS[e.key.toLowerCase()]);
    if (e.key === '[') tools.setOption('brush', Math.max(8, tools.options.brush / 2));
    if (e.key === ']') tools.setOption('brush', Math.min(2048, tools.options.brush * 2));
  });

  /** Overlay layer drawing the brush cursor for the active tool. */
  tools.cursorLayer = { id: 'cursor', name: 'Cursor', draw(ctx, v, w, h) { handlers[tools.current]?.cursor?.(ctx, v, w, h, tools); } };
  return tools;
}

/** Circle brush cursor in world units. */
export function drawBrushCursor(ctx, view, w, h, tools) {
  if (!tools.pointer) return;
  const [sx, sy] = tools.pointer;
  ctx.beginPath(); ctx.arc(sx, sy, tools.options.brush * view.scale, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1; ctx.stroke();
}

/** Shared raster brush tool: left = fnPrimary, right/alt = fnSecondary. */
export function rasterBrushTool(app, raster, label, fnPrimary, fnSecondary) {
  const rec = createStrokeRecorder(raster);
  let fn = null;
  const stamp = (wx, wz) => raster.stamp(wx, wz, app.tools.options.brush, fn);
  return {
    down(e, wx, wz) { fn = (e.button === 2 || e.altKey) ? fnSecondary() : fnPrimary(); rec.begin(); stamp(wx, wz); },
    move(e, wx, wz) { if (fn) stamp(wx, wz); },
    up() { fn = null; const cmd = rec.end(label); if (cmd) { app.history.push(cmd); app.markDirty(); } },
    cursor: drawBrushCursor,
  };
}
