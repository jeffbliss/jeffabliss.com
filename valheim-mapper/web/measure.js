// Measure tool: click points to lay out a route; the sidebar shows its length and the time at each gait. Nothing is saved.
import { SPEEDS, ZONE_M } from './world.js';
import { fmtDistance, fmtTime } from './scale.js';
import { nearestPin } from './pins.js';

/** Length of a polyline in metres. */
export const pathLength = pts => pts.reduce((m, p, i) => i ? m + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0, 0);

/** { metres, label: '320 m · 5 zones', rows: [{name, mps, time, note}] } for a route; null with fewer than two points. */
export function measureSummary(points) {
  if (points.length < 2) return null;
  const metres = pathLength(points), zones = metres / ZONE_M;
  return {
    metres, label: `${fmtDistance(Math.round(metres))} · ${zones < 10 ? +zones.toFixed(1) : Math.round(zones)} zone${zones === 1 ? '' : 's'}`,
    rows: SPEEDS.map(s => ({ ...s, time: fmtTime(metres / s.mps) })),
  };
}

/** The tool. `panel` = { setSummary(summary|null) }. Points snap to pins under the cursor. */
export function measureTool(app, panel) {
  const tool = { points: [] };
  const snap = (wx, wz) => { const p = nearestPin(app.state.pins, wx, wz, 14 * app.dpr() / app.view.scale); return p ? [p.x, p.z] : [wx, wz]; };
  const live = () => app.tools.pointer && tool.points.length ? [...tool.points, snap(app.tools.pointer[2], app.tools.pointer[3])] : tool.points;
  let shown = null;   // the last summary label pushed to the panel, so the sidebar tracks the cursor without churning the DOM every frame
  const show = s => { const l = s?.label ?? null; if (l !== shown) { shown = l; panel.setSummary(s); } };
  tool.refresh = () => { show(measureSummary(live())); app.requestRender(); };
  tool.clear = () => { tool.points = []; tool.refresh(); };
  tool.down = (e, wx, wz) => { if (e.detail === 2) return; tool.points.push(snap(wx, wz)); tool.refresh(); };
  tool.cursor = (ctx, view, w, h) => {
    const pts = live(); if (!pts.length) return;
    const dpr = app.dpr(), P = ([x, z]) => view.worldToScreen(x, z, w, h);
    ctx.setLineDash([6 * dpr, 4 * dpr]); ctx.strokeStyle = '#ffd77a'; ctx.lineWidth = 2 * dpr; ctx.beginPath();
    pts.forEach((p, i) => { const [sx, sy] = P(p); i ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy); }); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#ffd77a'; for (const p of pts) { const [sx, sy] = P(p); ctx.beginPath(); ctx.arc(sx, sy, 3 * dpr, 0, Math.PI * 2); ctx.fill(); }
    const s = measureSummary(pts); show(s); if (!s) return;
    const [ex, ey] = P(pts[pts.length - 1]), text = `${s.label} · ${s.rows[1].time} jog`;
    ctx.font = `${Math.round(13 * dpr)}px "Averia Serif"`; ctx.textBaseline = 'bottom'; ctx.textAlign = 'left';
    const tw = ctx.measureText(text).width, pad = 4 * dpr;
    ctx.fillStyle = 'rgba(27, 22, 16, 0.85)'; ctx.fillRect(ex + 8 * dpr, ey - 22 * dpr, tw + pad * 2, 18 * dpr);
    ctx.fillStyle = '#e8dcc4'; ctx.fillText(text, ex + 8 * dpr + pad, ey - 6 * dpr);
  };
  return tool;
}
