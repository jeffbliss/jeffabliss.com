import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createView } from '../web/view.js';
import { WORLD_SIZE } from '../web/world.js';

const W = 800, H = 600;
const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

test('origin maps to screen centre, z north is screen up', () => {
  const v = createView({ x: 0, z: 0, scale: 1 });
  assert.deepEqual(v.worldToScreen(0, 0, W, H), [400, 300]);
  const [sx, sy] = v.worldToScreen(10, 10, W, H);
  near(sx, 410); near(sy, 290);
});

test('screenToWorld inverts worldToScreen', () => {
  const v = createView({ x: 123, z: -456, scale: 0.37 });
  const [sx, sy] = v.worldToScreen(1000, 2000, W, H);
  const [wx, wz] = v.screenToWorld(sx, sy, W, H);
  near(wx, 1000); near(wz, 2000);
});

test('zoomAt keeps the world point under the cursor fixed', () => {
  const v = createView({ x: 0, z: 0, scale: 0.1 });
  const before = v.screenToWorld(100, 500, W, H);
  v.zoomAt(100, 500, 2, W, H);
  const after = v.screenToWorld(100, 500, W, H);
  near(v.scale, 0.2); near(after[0], before[0]); near(after[1], before[1]);
});

test('zoomAt clamps to min/max scale', () => {
  const v = createView({ scale: 1 });
  v.zoomAt(0, 0, 1e9, W, H); near(v.scale, Math.max(W, H) / 64);   // one zone fills the view
  v.zoomAt(0, 0, 1e-9, W, H); near(v.scale, v.minScale);
});

test('panBy moves the camera opposite to the drag in world units', () => {
  const v = createView({ x: 0, z: 0, scale: 2 });
  v.panBy(20, -10);           // drag right 20px, up 10px
  near(v.x, -10); near(v.z, -5);
});

test('fitHome centres on spawn with 16 zones across the shorter side', () => {
  const v = createView(); v.fitHome(W, H);
  near(v.scale, Math.min(W, H) / 1024); near(v.x, 0); near(v.z, 0);
});

test('fitWorld shows the whole world', () => {
  const v = createView(); v.fitWorld(W, H);
  near(v.scale, H / WORLD_SIZE); near(v.x, 0); near(v.z, 0);
  const b = v.visibleBounds(W, H);
  assert.ok(b.z1 - b.z0 >= WORLD_SIZE - 1e-6);
});
