// Live sync with the MapRoom Durable Object: sends local ops, applies remote ones, tracks presence, reconnects.
import { encodeRasterOp, decodeRasterOp, unwrapServerRaster, LAYER_NAME } from './proto.js';

export function applyRemoteOp(state, op) {
  switch (op.type) {
    case 'ink.add': state.ink.push(op.stroke); break;
    case 'ink.remove': { const i = state.ink.findIndex(s => s.id === op.id); if (i >= 0) state.ink.splice(i, 1); break; }
    case 'pin.add': state.pins.push(op.pin); break;
    case 'pin.update': { const p = state.pins.find(p => p.id === op.id); if (p) Object.assign(p, op.patch); break; }
    case 'pin.remove': { const i = state.pins.findIndex(p => p.id === op.id); if (i >= 0) state.pins.splice(i, 1); break; }
  }
}

export function createSync(app, { WebSocketImpl = globalThis.WebSocket, url = new URL('api/ws', location.href).href.replace(/^http/, 'ws'), now = Date.now, setTimeoutFn = setTimeout } = {}) {
  let ws = null, backoff = 1000, lastCursor = -Infinity, pendingCursor = null, cursorTimer = false, hadHello = false;
  const sync = { status: 'connecting', onStatus: null, onPresence: null, you: null };
  const setStatus = s => { sync.status = s; sync.onStatus?.(s); };
  const send = data => { if (ws && ws.readyState === 1) ws.send(data); };

  sync.connect = () => {
    setStatus(hadHello ? 'reconnecting' : 'connecting');
    ws = new WebSocketImpl(String(url)); ws.binaryType = 'arraybuffer';
    ws.onopen = () => { backoff = 1000; };
    ws.onmessage = e => { sync.handleMessage(e.data); };
    ws.onclose = () => { ws = null; setStatus('reconnecting'); setTimeoutFn(sync.connect, backoff); backoff = Math.min(backoff * 2, 30_000); };
    ws.onerror = () => {};
  };

  sync.handleMessage = async data => {
    if (typeof data !== 'string') {
      const { payload } = unwrapServerRaster(new Uint8Array(data)); const { layer, rect, bytes } = decodeRasterOp(payload);
      app.state[LAYER_NAME[layer]].restore(rect, bytes, { touch: false }); app.requestRender(); return;
    }
    const msg = JSON.parse(data);
    switch (msg.t) {
      case 'hello': sync.you = msg.you; hadHello = true; await app.onSnapshot(msg.doc, msg.you); app.history.clear(); setStatus('connected'); app.requestRender(); break;
      case 'op': applyRemoteOp(app.state, msg.op); app.requestRender(); break;
      case 'presence': sync.onPresence?.(msg.users); break;
      case 'error': app.setStatus(`rejected: ${msg.message}`, 'error'); break;
    }
  };

  sync.sendOps = ops => { for (const op of ops) send(op.type === 'raster' ? encodeRasterOp(op) : JSON.stringify({ t: 'op', op })); };
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
