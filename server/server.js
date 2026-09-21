import http from 'node:http';
import { readFile, writeFile, rename, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.png': 'image/png', '.ttf': 'font/ttf', '.otf': 'font/otf', '.svg': 'image/svg+xml' };

export async function readMap(dataFile) {
  for (const f of [dataFile, dataFile + '.bak']) {
    try { return JSON.parse(await readFile(f, 'utf8')); } catch { /* try next */ }
  }
  return null;
}

export async function writeMap(dataFile, text) {
  await mkdir(path.dirname(dataFile), { recursive: true });
  const tmp = dataFile + '.tmp';
  await writeFile(tmp, text);
  try { await stat(dataFile); await rename(dataFile, dataFile + '.bak'); } catch { /* first save */ }
  await rename(tmp, dataFile);
}

function readBody(req, maxBody) {
  return new Promise((resolve, reject) => {
    const chunks = []; let n = 0, tooBig = false;
    req.on('data', c => { n += c.length; if (n > maxBody) { tooBig = true; chunks.length = 0; } else chunks.push(c); });   // keep draining so we can still reply
    req.on('end', () => tooBig ? reject(Object.assign(new Error('too large'), { status: 413 })) : resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

export function createServer({ webDir, dataFile, maxBody = 64 * 1024 * 1024 }) {
  const root = path.resolve(webDir);
  return http.createServer(async (req, res) => {
    const send = (status, body = '', type = 'text/plain') => { res.writeHead(status, body ? { 'content-type': type } : {}); res.end(body); };
    try {
      const url = new URL(req.url, 'http://x');
      if (url.pathname === '/api/map') {
        if (req.method === 'GET') { const doc = await readMap(dataFile); return doc ? send(200, JSON.stringify(doc), 'application/json') : send(204); }
        if (req.method === 'PUT') {
          const text = await readBody(req, maxBody);
          let doc; try { doc = JSON.parse(text); } catch { return send(400, 'invalid JSON'); }
          if (typeof doc?.version !== 'number') return send(400, 'missing version');
          await writeMap(dataFile, text); return send(204);
        }
        return send(405);
      }
      const rel = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
      const file = path.resolve(root, '.' + rel);
      if (!file.startsWith(root + path.sep)) return send(404);
      const data = await readFile(file).catch(() => null);
      if (!data) return send(404);
      res.writeHead(200, { 'content-type': MIME[path.extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-cache' });
      res.end(data);
    } catch (e) { send(e.status ?? 500, e.message); }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const port = Number(process.env.PORT ?? 8080);
  createServer({ webDir: path.join(here, '..', 'web'), dataFile: path.join(here, '..', 'data', 'map.json') })
    .listen(port, () => console.log(`valheim-mapper on http://localhost:${port}`));
}
