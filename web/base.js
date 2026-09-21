import { WORLD_HALF, WORLD_SIZE, WORLD_RADIUS, TILE_M } from './world.js';
import { worldPattern } from './layers.js';

export function createBase(textures) {
  return {
    id: 'base', name: 'Parchment',
    draw(ctx, view, w, h) {
      view.applyTo(ctx, w, h);
      ctx.fillStyle = worldPattern(ctx, textures.space, TILE_M.space);
      const b = view.visibleBounds(w, h);
      ctx.fillRect(b.x0, b.z0, b.x1 - b.x0, b.z1 - b.z0);
      ctx.beginPath(); ctx.arc(0, 0, WORLD_RADIUS, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = worldPattern(ctx, textures.background, TILE_M.background);
      ctx.fillRect(-WORLD_HALF, -WORLD_HALF, WORLD_SIZE, WORLD_SIZE);
    },
  };
}
