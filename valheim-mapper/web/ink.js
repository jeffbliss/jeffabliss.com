export function distToSegment(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, len2 = dx * dx + dz * dz;
  const t = len2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / len2)) : 0;
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
}

export function hitStroke(strokes, x, z, tol) {
  let best = -1, bestD = Infinity;
  strokes.forEach((s, i) => {
    const limit = s.width / 2 + tol;
    for (let k = 0; k < s.points.length - 1 || (k === 0 && s.points.length === 1); k++) {
      const a = s.points[k], b = s.points[k + 1] ?? a;
      const d = distToSegment(x, z, a[0], a[1], b[0], b[1]);
      if (d <= limit && d < bestD) { bestD = d; best = i; }
    }
  });
  return best;
}

export function simplify(points, eps) {
  if (points.length < 3) return points.slice();
  const out = [points[0]];
  for (let i = 1; i < points.length - 1; i++) { const l = out[out.length - 1]; if (Math.hypot(points[i][0] - l[0], points[i][1] - l[1]) >= eps) out.push(points[i]); }
  out.push(points[points.length - 1]);
  return out;
}

export function createInk(strokes) {
  let cur = null;
  for (const s of strokes) s.id ??= crypto.randomUUID();
  const drawStroke = (ctx, s) => {
    ctx.beginPath(); ctx.lineWidth = s.width; ctx.strokeStyle = s.color; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    s.points.forEach(([x, z], i) => i ? ctx.lineTo(x, z) : ctx.moveTo(x, z));
    if (s.points.length === 1) ctx.lineTo(s.points[0][0] + 0.01, s.points[0][1]);
    ctx.stroke();
  };
  return {
    id: 'ink', name: 'Ink', strokes,
    begin(color, width) { cur = { id: crypto.randomUUID(), color, width, points: [] }; },
    add(x, z) { cur?.points.push([x, z]); },
    end() { const s = cur; cur = null; if (!s) return null; s.points = simplify(s.points, s.width / 4); return s.points.length >= 1 ? s : null; },
    draw(ctx, view, w, h) {
      view.applyTo(ctx, w, h);
      for (const s of strokes) drawStroke(ctx, s);
      if (cur?.points.length) drawStroke(ctx, cur);
    },
  };
}

import { createStrokeRecorder, combine } from './history.js';
import { interpolate } from './tools.js';

export const INK_REVEAL_MIN_M = 24;   // fog cleared along an ink stroke: at least this radius, or the stroke width

/** Ink tool: a drag draws, or erases strokes under the cursor while options.inkErase is on. `reveal` = { raster, fn } clears fog along new strokes. */
export function inkTool(app, ink, reveal = null) {
  const revealRec = reveal && createStrokeRecorder(reveal.raster, reveal.layerName ?? 'fog');
  let erasing = false, erased = null;
  const tolPx = 6;
  return {
    down(e, wx, wz) {
      erasing = !!app.tools.options.inkErase;
      if (erasing) { erased = []; this.move(e, wx, wz); }
      else ink.begin(app.tools.options.inkColor, app.tools.options.inkWidth);
    },
    move(e, wx, wz) {
      if (!erasing) { ink.add(wx, wz); return; }
      const i = hitStroke(ink.strokes, wx, wz, tolPx / app.view.scale);
      if (i >= 0) erased.push({ index: i, stroke: ink.strokes.splice(i, 1)[0] });
    },
    up() {
      if (erasing) {
        const removed = erased; erased = null; erasing = false;
        if (!removed.length) return;
        app.history.push({ label: 'erase ink',
          ops: removed.map(r => ({ type: 'ink.remove', id: r.stroke.id })),
          inverseOps: removed.map(r => ({ type: 'ink.add', stroke: r.stroke })),
          undo: () => { for (const r of [...removed].reverse()) ink.strokes.splice(r.index, 0, r.stroke); },
          redo: () => { for (const r of removed) ink.strokes.splice(r.index, 1); } });
        app.markDirty(); return;
      }
      const s = ink.end(); if (!s) return;
      ink.strokes.push(s);
      const add = { ops: [{ type: 'ink.add', stroke: s }], inverseOps: [{ type: 'ink.remove', id: s.id }],
        undo: () => { const i = ink.strokes.indexOf(s); if (i >= 0) ink.strokes.splice(i, 1); }, redo: () => ink.strokes.push(s) };
      let revealCmd = null;
      if (revealRec) {
        revealRec.begin();
        const r = Math.max(INK_REVEAL_MIN_M, s.width);
        for (let i = 0; i < s.points.length; i++) {
          const [ax, az] = s.points[i], [bx, bz] = s.points[i + 1] ?? s.points[i];
          for (const [x, z] of interpolate(ax, az, bx, bz, r * 0.5)) reveal.raster.stamp(x, z, r, reveal.fn);
        }
        revealCmd = revealRec.end('ink');
      }
      app.history.push(combine('ink', add, revealCmd));
      app.markDirty();
    },
    cursor(ctx, view, w, h, tools) {
      if (!tools.pointer) return; const [sx, sy] = tools.pointer;
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      if (tools.options.inkErase) { ctx.strokeRect(sx - 6, sy - 6, 12, 12); return; }
      ctx.beginPath(); ctx.arc(sx, sy, Math.max(2, tools.options.inkWidth * view.scale / 2), 0, Math.PI * 2); ctx.stroke();
    },
  };
}
