// Copy a rectangle of the map (terrain, fog, ink, pins) and paste it elsewhere, on this map or a friend's tab.
// The copy travels through the system clipboard as JSON text, so it works across tabs with no permissions prompt.
import { combine } from './history.js';
import { toBase64, fromBase64 } from './png.js';
import { isTypingTarget } from './tools.js';

export const CLIP_TYPE = 'valheim-mapper/clip';

/** World rect → inclusive cell rect clamped to the raster, or null when it misses the raster entirely. */
export function cellRect(raster, r) {
  const [ax, az] = raster.toCell(r.x0, r.z0), [bx, bz] = raster.toCell(r.x1 - 1e-9, r.z1 - 1e-9);
  const c = raster.cells - 1, rect = { x0: Math.max(0, ax), z0: Math.max(0, az), x1: Math.min(c, bx), z1: Math.min(c, bz) };
  return rect.x1 < rect.x0 || rect.z1 < rect.z0 ? null : rect;
}
/** World coordinates of the south-west corner of cell (cx, cz). */
const cellOrigin = (raster, cx, cz) => { const [x, z] = raster.cellCenter(cx, cz); return [x - raster.cellM / 2, z - raster.cellM / 2]; };

/** Everything inside the cell rect, positions relative to the rect's south-west corner. Strokes must lie wholly inside; the start pin is never copied. */
export function copyRegion(state, rect) {
  const { terrain, fog } = state, [ox, oz] = cellOrigin(terrain, rect.x0, rect.z0);
  const w = rect.x1 - rect.x0 + 1, h = rect.z1 - rect.z0 + 1, ex = ox + w * terrain.cellM, ez = oz + h * terrain.cellM;
  const inside = (x, z) => x >= ox && x < ex && z >= oz && z < ez;
  return {
    type: CLIP_TYPE, cellM: terrain.cellM, w, h,
    terrain: toBase64(terrain.snapshot(rect)), fog: toBase64(fog.snapshot(rect)),
    ink: state.ink.filter(s => s.points.every(([x, z]) => inside(x, z))).map(s => ({ color: s.color, width: s.width, points: s.points.map(([x, z]) => [x - ox, z - oz]) })),
    pins: state.pins.filter(p => !p.fixed && p.type !== 'start' && inside(p.x, p.z)).map(p => ({ type: p.type, name: p.name, checked: !!p.checked, shore: !!p.shore, x: p.x - ox, z: p.z - oz })),
  };
}

/** Parses clipboard text back into a clip (bytes decoded), or null when it is not one of ours. */
export function parseClip(text) {
  try {
    const c = JSON.parse(text);
    if (c?.type !== CLIP_TYPE || !Number.isInteger(c.w) || !Number.isInteger(c.h) || c.w < 1 || c.h < 1) return null;
    const terrain = fromBase64(c.terrain), fog = fromBase64(c.fog);
    if (terrain.length !== c.w * c.h || fog.length !== c.w * c.h) return null;
    return { ...c, terrain, fog, ink: Array.isArray(c.ink) ? c.ink : [], pins: Array.isArray(c.pins) ? c.pins : [] };
  } catch { return null; }
}

const rasterCmd = (raster, layer, rect, before, after) => before.every((v, i) => v === after[i]) ? null
  : { ops: [{ type: 'raster', layer, rect, bytes: after }], inverseOps: [{ type: 'raster', layer, rect, bytes: before }],
      undo: () => raster.restore(rect, before), redo: () => raster.restore(rect, after) };

/**
 * The command that pastes `clip` centred on world point (x, z). Blank terrain cells are transparent (what is there stays),
 * fog reveal merges, ink and pins arrive as new strokes/pins with fresh ids. Null when nothing would change.
 */
export function pasteCommand(state, clip, x, z) {
  const { terrain, fog } = state, m = clip.cellM;
  const [cx0, cz0] = terrain.toCell(x - clip.w * m / 2 + m / 2, z - clip.h * m / 2 + m / 2);   // cell that receives clip cell (0, 0)
  const [ox, oz] = cellOrigin(terrain, cx0, cz0);
  const c = terrain.cells - 1, rect = { x0: Math.max(0, cx0), z0: Math.max(0, cz0), x1: Math.min(c, cx0 + clip.w - 1), z1: Math.min(c, cz0 + clip.h - 1) };
  const cmds = [];
  if (rect.x1 >= rect.x0 && rect.z1 >= rect.z0) {
    const w = rect.x1 - rect.x0 + 1, tBefore = terrain.snapshot(rect), fBefore = fog.snapshot(rect), tAfter = tBefore.slice(), fAfter = fBefore.slice();
    for (let z = rect.z0; z <= rect.z1; z++) for (let xx = rect.x0; xx <= rect.x1; xx++) {
      const src = (z - cz0) * clip.w + (xx - cx0), dst = (z - rect.z0) * w + (xx - rect.x0);
      if (clip.terrain[src]) tAfter[dst] = clip.terrain[src];
      fAfter[dst] = Math.max(fAfter[dst], clip.fog[src]);
    }
    cmds.push(rasterCmd(terrain, 'terrain', rect, tBefore, tAfter), rasterCmd(fog, 'fog', rect, fBefore, fAfter));
  }
  const strokes = clip.ink.map(s => ({ id: crypto.randomUUID(), color: s.color, width: s.width, points: s.points.map(([px, pz]) => [px + ox, pz + oz]) }));
  if (strokes.length) cmds.push({
    ops: strokes.map(s => ({ type: 'ink.add', stroke: s })), inverseOps: strokes.map(s => ({ type: 'ink.remove', id: s.id })),
    undo: () => { for (const s of strokes) { const i = state.ink.indexOf(s); if (i >= 0) state.ink.splice(i, 1); } }, redo: () => state.ink.push(...strokes) });
  const pins = clip.pins.map(p => ({ id: crypto.randomUUID(), x: p.x + ox, z: p.z + oz, type: p.type, name: p.name ?? '', checked: !!p.checked, shore: !!p.shore }));
  if (pins.length) cmds.push({
    ops: pins.map(p => ({ type: 'pin.add', pin: p })), inverseOps: pins.map(p => ({ type: 'pin.remove', id: p.id })),
    undo: () => { for (const p of pins) { const i = state.pins.indexOf(p); if (i >= 0) state.pins.splice(i, 1); } }, redo: () => state.pins.push(...pins) });
  const cmd = combine('paste', ...cmds);
  if (cmd) cmd.redo();
  return cmd;
}

/** Wires selection drawing, Cmd/Ctrl+C, Cmd/Ctrl+V, click-to-place and Escape onto the app. */
export function createClipboard(app) {
  let clip = null, pasting = null;
  app.selection = null;
  const panGesture = app.isPanGesture;
  app.isPanGesture = e => !pasting && panGesture(e);
  const place = (e, wx, wz) => {
    if (!pasting || e.button !== 0) return false;
    const cmd = pasteCommand(app.state, pasting, wx, wz);
    if (cmd) { app.history.push(cmd); app.markDirty(); }
    pasting = null; app.tools.intercept = null; app.toast(''); app.requestRender();
    return true;
  };
  const beginPaste = c => { pasting = c; app.tools.intercept = place; app.toast('Click where the copy should go · Esc cancels', 0); app.requestRender(); };

  /** Copies the selection into `clip`; returns the JSON text (or null without a selection). */
  const copy = () => {
    const rect = app.selection && cellRect(app.state.terrain, app.selection); if (!rect) return null;
    clip = copyRegion(app.state, rect);
    app.toast(`Copied ${rect.x1 - rect.x0 + 1}×${rect.z1 - rect.z0 + 1} cells, ${clip.ink.length} strokes, ${clip.pins.length} pins · Cmd/Ctrl+V to paste`);
    return JSON.stringify(clip);
  };
  // The copy/paste events carry the clip through the system clipboard (so it works into a friend's tab) and need no
  // permission. The keydown path below covers browsers or embeddings where the shortcut does not raise those events.
  document.addEventListener('copy', e => {
    if (isTypingTarget(e) || !app.selection) return;
    const text = copy(); if (text) { e.clipboardData.setData('text/plain', text); e.preventDefault(); }
  });
  document.addEventListener('paste', e => {
    if (isTypingTarget(e)) return;
    const c = parseClip(e.clipboardData.getData('text/plain')) ?? clip;
    if (c) { e.preventDefault(); beginPaste(c); }
  });
  addEventListener('keydown', e => {
    if (isTypingTarget(e)) return;
    const mod = e.metaKey || e.ctrlKey, k = e.key.toLowerCase();
    if (mod && k === 'c' && app.selection) { const text = copy(); if (text) navigator.clipboard?.writeText(text).catch(() => {}); }
    if (mod && k === 'v' && clip && !pasting && app.tools.editing) beginPaste(clip);
    if (e.key !== 'Escape') return;
    if (pasting) { pasting = null; app.tools.intercept = null; app.toast(''); }
    app.selection = null; app.requestRender();
  });

  app.tools.overlay = (ctx, view, w, h) => {
    const dpr = app.dpr();
    const box = (r, dash) => {
      const [sx0, sy1] = view.worldToScreen(r.x0, r.z0, w, h), [sx1, sy0] = view.worldToScreen(r.x1, r.z1, w, h);
      ctx.setLineDash(dash); ctx.lineWidth = 1.5 * dpr; ctx.strokeStyle = 'rgba(255, 215, 122, 0.95)'; ctx.strokeRect(sx0, sy0, sx1 - sx0, sy1 - sy0);
      ctx.fillStyle = 'rgba(255, 215, 122, 0.08)'; ctx.fillRect(sx0, sy0, sx1 - sx0, sy1 - sy0); ctx.setLineDash([]);
    };
    if (app.selection) box(app.selection, [6 * dpr, 4 * dpr]);
    if (pasting && app.tools.pointer) {
      const [, , wx, wz] = app.tools.pointer, hw = pasting.w * pasting.cellM / 2, hh = pasting.h * pasting.cellM / 2;
      box({ x0: wx - hw, z0: wz - hh, x1: wx + hw, z1: wz + hh }, [3 * dpr, 3 * dpr]);
    }
  };
}
