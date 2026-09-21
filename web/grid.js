import { WORLD_HALF } from './world.js';

export function chooseSpacing(baseM, scale, minPx = 6) {
  if (baseM * scale >= minPx) return baseM;
  return 1000 * scale >= minPx ? 1000 : 5000;
}

export function createGrid(settings) {
  const layer = {
    id: 'grid', name: 'Grid',
    get visible() { return settings.grid.visible; }, set visible(v) { settings.grid.visible = v; },
    draw(ctx, view, w, h) {
      const s = chooseSpacing(settings.grid.spacing, view.scale);
      const b = view.visibleBounds(w, h);
      const x0 = Math.max(-WORLD_HALF, Math.floor(b.x0 / s) * s), x1 = Math.min(WORLD_HALF, b.x1);
      const z0 = Math.max(-WORLD_HALF, Math.floor(b.z0 / s) * s), z1 = Math.min(WORLD_HALF, b.z1);
      view.applyTo(ctx, w, h);
      ctx.lineWidth = 1 / view.scale;
      ctx.strokeStyle = 'rgba(40, 25, 10, 0.35)';
      ctx.beginPath();
      for (let x = x0; x <= x1; x += s) { ctx.moveTo(x, Math.max(-WORLD_HALF, b.z0)); ctx.lineTo(x, Math.min(WORLD_HALF, b.z1)); }
      for (let z = z0; z <= z1; z += s) { ctx.moveTo(Math.max(-WORLD_HALF, b.x0), z); ctx.lineTo(Math.min(WORLD_HALF, b.x1), z); }
      ctx.stroke();
      // Labels on 1 km lines (or every line when spacing >= 1 km)
      const labelEvery = Math.max(s, 1000);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.font = `${Math.round(11 * (window.devicePixelRatio || 1))}px "Averia Serif"`;
      ctx.fillStyle = 'rgba(40, 25, 10, 0.7)'; ctx.textBaseline = 'top';
      for (let x = Math.ceil(x0 / labelEvery) * labelEvery; x <= x1; x += labelEvery) { const [sx] = view.worldToScreen(x, 0, w, h); ctx.fillText(`${x}`, sx + 3, 3); }
      for (let z = Math.ceil(z0 / labelEvery) * labelEvery; z <= z1; z += labelEvery) { const [, sy] = view.worldToScreen(0, z, w, h); ctx.fillText(`${z}`, 3, sy + 3); }
    },
  };
  return layer;
}
