import { WORLD_SIZE } from './world.js';

export function createView({ x = 0, z = 0, scale = 0.04 } = {}) {
  const v = { x, z, scale, minScale: 0.02, maxScale: 2 };
  v.worldToScreen = (wx, wz, w, h) => [w / 2 + (wx - v.x) * v.scale, h / 2 - (wz - v.z) * v.scale];
  v.screenToWorld = (sx, sy, w, h) => [v.x + (sx - w / 2) / v.scale, v.z - (sy - h / 2) / v.scale];
  v.zoomAt = (sx, sy, factor, w, h) => {
    const [wx, wz] = v.screenToWorld(sx, sy, w, h);
    v.scale = Math.min(v.maxScale, Math.max(v.minScale, v.scale * factor));
    v.x = wx - (sx - w / 2) / v.scale;
    v.z = wz + (sy - h / 2) / v.scale;
  };
  v.panBy = (dx, dy) => { v.x -= dx / v.scale; v.z += dy / v.scale; };
  v.fitWorld = (w, h) => { v.x = 0; v.z = 0; v.scale = Math.min(w, h) / WORLD_SIZE; };
  v.applyTo = (ctx, w, h) => ctx.setTransform(v.scale, 0, 0, -v.scale, w / 2 - v.x * v.scale, h / 2 + v.z * v.scale);
  v.visibleBounds = (w, h) => {
    const [x0, z1] = v.screenToWorld(0, 0, w, h);
    const [x1, z0] = v.screenToWorld(w, h, w, h);
    return { x0, x1, z0, z1 };
  };
  v.toJSON = () => ({ x: v.x, z: v.z, scale: v.scale });
  return v;
}
