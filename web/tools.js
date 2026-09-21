import { createStrokeRecorder } from './history.js';

const HOTKEYS = { h: 'pan', b: 'paint', i: 'ink', f: 'fog', p: 'pin', v: 'select' };

/** True when the key event is aimed at a text field, so app hotkeys must not fire. */
export const isTypingTarget = e => { const t = e.target; return !!t && (t.tagName === 'INPUT' && !['range', 'checkbox', 'color', 'file', 'button'].includes(t.type) || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable); };

/** Points from a (exclusive) to b (inclusive) spaced at most `step` metres apart. */
export function interpolate(ax, az, bx, bz, step) {
  const d = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(d / step)), out = [];
  for (let i = 1; i <= n; i++) out.push([ax + (bx - ax) * i / n, az + (bz - az) * i / n]);
  return out;
}

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
    if (active || handlers[tools.current]?.cursor) app.requestRender();
  });
  const finish = e => { if (!active) return; const [sx, sy, wx, wz] = pos(e); active.up?.(e, wx, wz, sx, sy); active = null; app.requestRender(); };
  canvas.addEventListener('pointerup', finish); canvas.addEventListener('pointercancel', finish);
  canvas.addEventListener('contextmenu', e => e.preventDefault());

  addEventListener('keydown', e => {
    if (isTypingTarget(e)) return;
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey ? app.history.redo() : app.history.undo()) app.markDirty(); return; }
    if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); if (app.history.redo()) app.markDirty(); return; }
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
  let last = null;
  const stamp = (wx, wz) => raster.stamp(wx, wz, app.tools.options.brush, fn);
  return {
    down(e, wx, wz) { fn = (e.button === 2 || e.altKey) ? fnSecondary() : fnPrimary(); rec.begin(); stamp(wx, wz); last = [wx, wz]; },
    move(e, wx, wz) {
      if (!fn) return;
      for (const [x, z] of interpolate(last[0], last[1], wx, wz, Math.max(4, app.tools.options.brush * 0.35))) stamp(x, z);
      last = [wx, wz];
    },
    up() { fn = null; last = null; const cmd = rec.end(label); if (cmd) { app.history.push(cmd); app.markDirty(); } },
    cursor: drawBrushCursor,
  };
}
