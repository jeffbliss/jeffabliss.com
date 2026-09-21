import { test } from 'node:test';
import assert from 'node:assert/strict';
import { niceDistance, zoneDistance, fmtZones, fmtDistance, fmtTime, scaleBarInfo } from '../web/scale.js';

test('niceDistance picks the largest 1/2/5 step that fits', () => {
  assert.equal(niceDistance(1, 140), 100);
  assert.equal(niceDistance(0.05, 140), 2000);
  assert.equal(niceDistance(0.25, 140), 500);
});

test('zoneDistance snaps to power-of-two zone multiples and fractions', () => {
  assert.equal(zoneDistance(1, 200), 128);        // 200 m max -> 2 zones
  assert.equal(zoneDistance(0.25, 200), 512);     // 800 m max -> 8 zones
  assert.equal(zoneDistance(0.1, 200), 1024);     // capped at 16 zones
  assert.equal(zoneDistance(5, 200), 32);         // 40 m max -> half a zone
  assert.equal(zoneDistance(100, 200), 8);        // never below one raster cell
});

test('formats zones, distances and times', () => {
  assert.equal(fmtZones(64), '1 zone'); assert.equal(fmtZones(256), '4 zones'); assert.equal(fmtZones(16), '¼ zone');
  assert.equal(fmtDistance(500), '500 m'); assert.equal(fmtDistance(2500), '2.5 km');
  assert.equal(fmtTime(16), '16 s'); assert.equal(fmtTime(125), '2.1 min'); assert.equal(fmtTime(3600), '1 h');
});

test('scaleBarInfo uses zones while the 64 m grid is drawn and km once it steps up', () => {
  const z = scaleBarInfo(1, 2);                     // grid legible: zone mode
  assert.equal(z.zones, true); assert.equal(z.metres, 128); assert.equal(z.label, '128 m · 2 zones'); assert.equal(z.jog, '32 s');
  assert.equal(z.rows.find(r => r.name === 'Jog').note, 'default');
  const k = scaleBarInfo(0.025, 0.05);               // 64 m = 3.2 device px: grid is at 1 km, bar in km
  assert.equal(k.zones, false); assert.equal(k.metres, 5000); assert.equal(k.label, '5 km');
});
