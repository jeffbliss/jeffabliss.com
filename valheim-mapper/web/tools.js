import { createStrokeRecorder, combine } from './history.js';
import { CELL_M } from './world.js';

/** Brush radii in metres. 8 m is one raster cell; 128 m is a whole biome patch. */
export const BRUSH_SIZES = [8, 16, 32, 64, 128];
export const DEFAULT_BRUSH = 32;
/** Ink stroke widths in metres. 2 m is a hairline for cliffs and inlets; 4 m (half a raster cell) suits coastlines; 32 m is a bold region border. */
export const INK_WIDTHS = [2, 4, 8, 16, 32];
export const DEFAULT_INK_WIDTH = 4;
/** Quick ink colours: dark ink, white, then the six colour-wheel primaries and secondaries. */
export const INK_COLORS = ['#2b1d0e', '#f4ecd8', '#d62828', '#f77f00', '#f2c014', '#2a9d3f', '#1d6fd6', '#7b3fbf'];

const HOTKEYS = { b: 'paint', i: 'ink', p: 'pin', v: 'select', l: 'log', m: 'measure' };
const EDIT_TOOLS = ['paint', 'ink', 'pin', 'select', 'log'];

/** True when this press should pan the camera: any button in View (except while measuring), right/middle/Space+drag in Edit. */
export const panGesture = (e, { editing, tool, spaceDown }) => e.button === 1 || e.button === 2 || !!spaceDown || (!editing && tool !== 'measure');

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
  const tools = { current: 'view', editing: false, options: { biome: 1, brush: DEFAULT_BRUSH, fill: false, inkColor: '#2b1d0e', inkWidth: DEFAULT_INK_WIDTH, inkErase: false, pinType: 'pin' }, onChange: null };
  let lastEdit = 'paint';
  tools.register = (name, handler) => { handlers[name] = handler; };
  const resting = () => tools.editing ? lastEdit : 'view';
  tools.set = name => {
    if (name === 'measure' && tools.current === 'measure') name = resting();
    else if (EDIT_TOOLS.includes(name)) { if (!tools.editing || !handlers[name]) return; lastEdit = name; }
    else if (name !== 'measure' && name !== 'view') return;
    tools.current = name; app.tool = name; tools.onChange?.(); app.requestRender();
  };
  tools.setEditing = on => { tools.editing = !!on; if (tools.current !== 'measure') tools.set(resting()); else tools.onChange?.(); };
  tools.setOption = (k, v) => { tools.options[k] = v; tools.onChange?.(); app.requestRender(); };

  const { canvas, view } = app;
  const pos = e => { const p = [e.offsetX * app.dpr(), e.offsetY * app.dpr()]; return [...p, ...view.screenToWorld(p[0], p[1], ...app.size())]; };
  let active = null;
  tools.pointer = null;                                     // last [sx, sy, wx, wz] for cursor overlays
  canvas.addEventListener('pointerdown', e => {
    if (tools.intercept) { const [, , wx, wz] = pos(e); if (tools.intercept(e, wx, wz)) { e.preventDefault(); return; } }   // e.g. placing a paste
    if (app.isPanGesture(e)) return;
    const h = handlers[tools.current]; if (!h) return;
    e.preventDefault(); canvas.setPointerCapture(e.pointerId); active = h;
    const [sx, sy, wx, wz] = pos(e); h.down?.(e, wx, wz, sx, sy); app.requestRender();
  });
  canvas.addEventListener('pointermove', e => {
    const p = pos(e); tools.pointer = p;
    app.onPointer?.(p[2], p[3], tools.current, tools.options.brush);   // shares this cursor with the room
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
    if (e.key.toLowerCase() === 'e' && !mod) tools.setEditing(!tools.editing);
    if (e.key === 'Escape' && tools.editing && !tools.intercept && tools.current !== 'measure') tools.setEditing(false);
    if (e.key.toLowerCase() === 'g' && !mod && tools.editing) { tools.set('paint'); tools.setOption('fill', true); }
    if (tools.current === 'paint' && tools.options.fill && (e.key === '[' || e.key === ']')) tools.setOption('fill', false);
    // [ and ] step the size of whichever tool is active: ink width in Ink, brush radius otherwise.
    const [key, sizes] = tools.current === 'ink' ? ['inkWidth', INK_WIDTHS] : ['brush', BRUSH_SIZES];
    const i = sizes.indexOf(tools.options[key]);
    if (e.key === '[') tools.setOption(key, sizes[Math.max(0, i - 1)]);
    if (e.key === ']') tools.setOption(key, sizes[Math.min(sizes.length - 1, i + 1)]);
  });

  /** Overlay layer drawing the brush cursor for the active tool. */
  tools.cursorLayer = { id: 'cursor', name: 'Cursor', draw(ctx, v, w, h) { tools.overlay?.(ctx, v, w, h); handlers[tools.current]?.cursor?.(ctx, v, w, h, tools); } };
  return tools;
}

/**
 * The Paint tool: routes each stroke to the terrain brush, or to the fog brush when the
 * palette's Fog swatch is selected (options.biome === 'fog'). Fog paints over terrain without erasing it.
 */
export function paintTool(app, terrainBrush, fogBrush, fill = null) {
  let active = null;
  return {
    down(e, wx, wz, ...a) {
      if (app.tools.options.fill && fill) { fill(wx, wz); return; }        // one click fills an enclosed area
      active = app.tools.options.biome === 'fog' ? fogBrush : terrainBrush; active.down(e, wx, wz, ...a);
    },
    move(...a) { active?.move(...a); },
    up(...a) { active?.up(...a); active = null; },
    cursor(ctx, view, w, h, tools) {
      if (!tools.options.fill) return drawBrushCursor(ctx, view, w, h, tools);
      if (!tools.pointer) return; const [sx, sy] = tools.pointer, s = Math.max(6, CELL_M * view.scale);
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1; ctx.strokeRect(sx - s / 2, sy - s / 2, s, s);
    },
  };
}

/** Circle brush cursor in world units. */
export function drawBrushCursor(ctx, view, w, h, tools) {
  if (!tools.pointer) return;
  const [sx, sy] = tools.pointer;
  ctx.beginPath(); ctx.arc(sx, sy, tools.options.brush * view.scale, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1; ctx.stroke();
}

/**
 * Shared raster brush tool: a drag stamps makeFn() along the stroke.
 * `reveal` = { raster, fn }: when given, every stamp also clears fog under the brush (exploring by drawing),
 * recorded into the same undo command.
 */
export function rasterBrushTool(app, raster, layerName, makeFn, reveal = null) {
  const rec = createStrokeRecorder(raster, layerName), revealRec = reveal && createStrokeRecorder(reveal.raster, reveal.layerName ?? 'fog');
  let fn = null;
  let last = null;
  const stamp = (wx, wz) => {
    raster.stamp(wx, wz, app.tools.options.brush, fn);
    if (reveal) reveal.raster.stamp(wx, wz, app.tools.options.brush, reveal.fn);
  };
  return {
    down(e, wx, wz) {
      fn = makeFn();
      rec.begin(); revealRec?.begin(); stamp(wx, wz); last = [wx, wz];
    },
    move(e, wx, wz) {
      if (!fn) return;
      for (const [x, z] of interpolate(last[0], last[1], wx, wz, Math.max(4, app.tools.options.brush * 0.35))) stamp(x, z);
      last = [wx, wz];
    },
    up() { fn = null; last = null; const cmd = combine(layerName, rec.end(layerName), revealRec?.end(layerName)); if (cmd) { app.history.push(cmd); app.markDirty(); } },
    cursor: drawBrushCursor,
  };
}
