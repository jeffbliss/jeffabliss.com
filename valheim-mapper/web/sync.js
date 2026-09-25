// Live sync with the MapRoom Durable Object: sends local ops, applies remote ones, tracks presence, reconnects.
import { encodeRasterOp, decodeRasterOp, unwrapServerRaster, splitRasterOp, LAYER_NAME } from './proto.js';

/** Replaces an entry with the same id rather than appending: a re-sent add must not duplicate. */
const upsert = (list, item) => { const i = list.findIndex(e => e.id === item.id); i >= 0 ? (list[i] = item) : list.push(item); };

export function applyRemoteOp(state, op) {
  switch (op.type) {
    case 'ink.add': upsert(state.ink, op.stroke); break;
    case 'ink.remove': { const i = state.ink.findIndex(s => s.id === op.id); if (i >= 0) state.ink.splice(i, 1); break; }
    case 'pin.add': upsert(state.pins, op.pin); break;
    case 'pin.update': { const p = state.pins.find(p => p.id === op.id); if (p) Object.assign(p, op.patch); break; }
    case 'pin.remove': { const i = state.pins.findIndex(p => p.id === op.id); if (i >= 0) state.pins.splice(i, 1); break; }
    case 'pin.sight': case 'pin.unsight': { const p = state.pins.find(p => p.id === op.id); if (!p) break;
      const next = (p.sightings ?? []).filter(s => s.from !== op.from);
      if (op.type === 'pin.sight') { const i = (p.sightings ?? []).findIndex(s => s.from === op.from); if (i >= 0) next.splice(i, 0, { from: op.from, bearing: op.bearing }); else next.push({ from: op.from, bearing: op.bearing }); }
      if (next.length) p.sightings = next; else delete p.sightings; break; }
  }
}

export function createSync(app, { WebSocketImpl = globalThis.WebSocket, url = new URL('api/ws' + location.search, location.href).href.replace(/^http/, 'ws'), now = Date.now, setTimeoutFn = setTimeout } = {}) {
  let ws = null, backoff = 1000, lastCursor = -Infinity, pendingCursor = null, cursorTimer = false, hadHello = false, attempts = 0;
  const sync = { status: 'connecting', onStatus: null, onPresence: null, you: null };
  const setStatus = s => { sync.status = s; sync.onStatus?.(s); };
  // Retries never stop (the socket may come back), but after this many tries without a hello we stop pretending.
  const OFFLINE_AFTER = 5;
  const waiting = otherwise => attempts >= OFFLINE_AFTER ? 'offline' : otherwise;
  // Silently dropped while disconnected, by design: reconnecting reloads the snapshot, so a queued op would be stale.
  const send = data => { if (ws && ws.readyState === 1) ws.send(data); };

  sync.connect = () => {
    attempts++;
    setStatus(waiting(hadHello ? 'reconnecting' : 'connecting'));
    ws = new WebSocketImpl(String(url)); ws.binaryType = 'arraybuffer';
    ws.onopen = () => { backoff = 1000; };
    // handleMessage is async (a hello decodes rasters), so messages are chained per connection:
    // an op arriving mid-decode must wait, or it lands on the state the snapshot is about to replace.
    let chain = Promise.resolve();
    ws.onmessage = e => { chain = chain.then(() => sync.handleMessage(e.data)).catch(err => console.error('sync', err)); };
    ws.onclose = () => { ws = null; setStatus(waiting('reconnecting')); setTimeoutFn(sync.connect, backoff); backoff = Math.min(backoff * 2, 30_000); };
    ws.onerror = () => {};
  };

  sync.handleMessage = async data => {
    if (typeof data !== 'string') {
      const { payload } = unwrapServerRaster(new Uint8Array(data)); const { layer, rect, bytes } = decodeRasterOp(payload);
      app.state[LAYER_NAME[layer]].restore(rect, bytes, { touch: false }); app.requestRender(); return;
    }
    const msg = JSON.parse(data);
    switch (msg.t) {
      case 'hello': sync.you = msg.you; hadHello = true; attempts = 0; await app.onSnapshot(msg.doc, msg.you); app.history.clear(); setStatus('connected'); app.requestRender(); break;
      case 'op': applyRemoteOp(app.state, msg.op); app.requestRender(); break;
      case 'presence': sync.onPresence?.(msg.users, !!msg.full); break;
      // A rejected op means our copy has diverged from the server's (an over-cap rect, a stale id).
      // Reconnecting is the only repair we have: the close triggers a fresh hello, which replaces the state.
      case 'error': app.setStatus(`rejected: ${msg.message} — resyncing…`, 'error'); ws?.close(); break;
    }
  };

  sync.sendOps = ops => {
    for (const op of ops) {
      if (op.type !== 'raster') { send(JSON.stringify({ t: 'op', op })); continue; }
      for (const piece of splitRasterOp(op)) send(encodeRasterOp(piece));   // one 2048 m brush is bigger than one frame may be
    }
  };
  app.history.onApply = sync.sendOps;

  const flushCursor = () => { cursorTimer = false; if (!pendingCursor) return; lastCursor = now(); send(JSON.stringify({ t: 'cursor', ...pendingCursor })); pendingCursor = null; };
  sync.cursor = (x, z, tool, brush) => {
    pendingCursor = { x, z, tool, brush };
    const wait = 200 - (now() - lastCursor);
    if (wait <= 0) return flushCursor();
    if (!cursorTimer) { cursorTimer = true; setTimeoutFn(flushCursor, wait); }
  };
  return sync;
}
