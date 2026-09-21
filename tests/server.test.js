import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createServer, readMap, writeMap } from '../server/server.js';

async function tmp() { return mkdtemp(path.join(tmpdir(), 'vm-')); }
async function listen(srv) { await new Promise(r => srv.listen(0, r)); return `http://127.0.0.1:${srv.address().port}`; }

test('writeMap is atomic and keeps a backup; readMap falls back to it', async () => {
  const dir = await tmp(), f = path.join(dir, 'map.json');
  assert.equal(await readMap(f), null);
  await writeMap(f, JSON.stringify({ version: 1, n: 1 }));
  await writeMap(f, JSON.stringify({ version: 1, n: 2 }));
  assert.equal((await readMap(f)).n, 2);
  assert.equal(JSON.parse(await readFile(f + '.bak', 'utf8')).n, 1);
  await writeFile(f, '{corrupt');
  assert.equal((await readMap(f)).n, 1);
});

test('api and static routes', async () => {
  const dir = await tmp(), web = path.join(dir, 'web'); await mkdir(web);
  await writeFile(path.join(web, 'index.html'), '<h1>hi</h1>');
  await writeFile(path.join(web, 'a.js'), 'export const a = 1;');
  const srv = createServer({ webDir: web, dataFile: path.join(dir, 'data', 'map.json'), maxBody: 1000 });
  const base = await listen(srv);
  try {
    assert.equal((await fetch(base + '/api/map')).status, 204);
    let r = await fetch(base + '/api/map', { method: 'PUT', body: JSON.stringify({ version: 1, pins: [] }) });
    assert.equal(r.status, 204);
    r = await fetch(base + '/api/map'); assert.equal(r.status, 200); assert.deepEqual((await r.json()).pins, []);
    r = await fetch(base + '/api/map', { method: 'PUT', body: 'nope' }); assert.equal(r.status, 400);
    r = await fetch(base + '/api/map', { method: 'PUT', body: JSON.stringify({ version: 1, big: 'x'.repeat(2000) }) }); assert.equal(r.status, 413);
    r = await fetch(base + '/'); assert.equal(r.status, 200); assert.match(r.headers.get('content-type'), /text\/html/);
    r = await fetch(base + '/a.js'); assert.match(r.headers.get('content-type'), /javascript/);
    assert.equal((await fetch(base + '/missing.png')).status, 404);
    assert.equal((await fetch(base + '/../package.json')).status, 404);
  } finally { srv.close(); }
});
