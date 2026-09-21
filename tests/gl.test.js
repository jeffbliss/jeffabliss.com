import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paletteBytes } from '../web/gl.js';
import { BIOMES } from '../web/world.js';

test('palette texture encodes biome tints, has-biome flag and detail weights', () => {
  const px = paletteBytes();
  assert.equal(px.length, 16 * 2 * 4);
  assert.deepEqual([...px.subarray(0, 4)], [255, 255, 255, 0]);                    // none: white tint, no biome
  const m = BIOMES.find(b => b.key === 'meadows');
  assert.deepEqual([...px.subarray(m.id * 4, m.id * 4 + 4)], [115, 255, 110, 255]);
  const bf = BIOMES.find(b => b.key === 'blackforest');
  assert.deepEqual([...px.subarray(64 + bf.id * 4, 64 + bf.id * 4 + 3)], [255, 0, 0]);   // forest detail
  const oc = BIOMES.find(b => b.key === 'ocean');
  assert.deepEqual([...px.subarray(64 + oc.id * 4, 64 + oc.id * 4 + 3)], [0, 0, 255]);   // water detail
});
