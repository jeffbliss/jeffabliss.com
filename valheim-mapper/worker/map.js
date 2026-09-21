// The one shared map: authoritative state in memory, tiles/rows in SQLite, WebSocket hub with hibernation.
import { DurableObject } from 'cloudflare:workers';
import { makeState, validateOp, validateRaster, applyOp, applyRaster, tileBytes, putTile, parseTileKey, snapshotDoc } from './ops.js';
import { decodeRasterOp, wrapServerRaster, identityFromEmail } from '../web/proto.js';

const FLUSH_MS = 2000;

export class MapRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.state = makeState(); this.seq = 0; this.dirty = new Set(); this.snapshot = null; this.sessions = new Map();
    ctx.blockConcurrencyWhile(async () => {
      const sql = ctx.storage.sql;
      sql.exec(`CREATE TABLE IF NOT EXISTS tiles(layer INTEGER, tx INTEGER, tz INTEGER, data BLOB, PRIMARY KEY(layer, tx, tz));
        CREATE TABLE IF NOT EXISTS ink(id TEXT PRIMARY KEY, json TEXT); CREATE TABLE IF NOT EXISTS pins(id TEXT PRIMARY KEY, json TEXT);
        CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY, value TEXT)`);
      for (const r of sql.exec('SELECT layer, tx, tz, data FROM tiles')) putTile(r.layer === 0 ? this.state.terrain : this.state.fog, r.tx, r.tz, new Uint8Array(r.data));
      for (const r of sql.exec('SELECT json FROM ink')) { const s = JSON.parse(r.json); this.state.ink.set(s.id, s); }
      for (const r of sql.exec('SELECT json FROM pins')) { const p = JSON.parse(r.json); this.state.pins.set(p.id, p); }
      const seq = sql.exec("SELECT value FROM meta WHERE key = 'seq'").toArray()[0]; this.seq = seq ? Number(seq.value) : 0;
      this.state.terrain.takeDirty(); this.state.fog.takeDirty();
      for (const ws of ctx.getWebSockets()) { const a = ws.deserializeAttachment(); if (a) this.sessions.set(ws, { ...a, x: null, z: null, tool: null, brush: 0, at: 0 }); }
    });
  }

  async fetch(request) {
    if (request.headers.get('upgrade') !== 'websocket') return new Response('expected websocket', { status: 426 });
    const email = request.headers.get('x-user-email'); if (!email) return new Response('no identity', { status: 403 });
    const who = identityFromEmail(email);
    const pair = new WebSocketPair(), [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server); server.serializeAttachment(who);
    this.sessions.set(server, { ...who, x: null, z: null, tool: null, brush: 0, at: 0 });
    if (this.dirty.size) await this.flush();
    server.send(JSON.stringify({ t: 'hello', you: who, seq: this.seq, doc: await this.doc() }));
    this.broadcastPresence();
    return new Response(null, { status: 101, webSocket: client });
  }

  async doc() { if (!this.snapshot || this.snapshot.seq !== this.seq) this.snapshot = { seq: this.seq, doc: await snapshotDoc(this.state) }; return this.snapshot.doc; }

  async webSocketMessage(ws, message) {
    const s = this.sessions.get(ws); if (!s) return;
    try {
      if (typeof message !== 'string') {
        const frame = new Uint8Array(message);
        const op = decodeRasterOp(frame); const err = validateRaster(op); if (err) return this.reply(ws, err);
        for (const k of applyRaster(this.state, op)) this.dirty.add(k);
        this.seq++; await this.scheduleFlush();
        this.broadcast(wrapServerRaster(this.seq, s.name, frame), ws);
        return;
      }
      const msg = JSON.parse(message);
      if (msg.t === 'cursor') { Object.assign(s, { x: msg.x, z: msg.z, tool: msg.tool, brush: msg.brush, at: Date.now() }); this.broadcast(JSON.stringify({ t: 'presence', users: [this.presenceOf(s)] }), ws); return; }
      if (msg.t === 'op') {
        const err = validateOp(msg.op); if (err) return this.reply(ws, err);
        const { persist } = applyOp(this.state, msg.op);
        for (const row of persist) row.json === null ? this.ctx.storage.sql.exec(`DELETE FROM ${row.table} WHERE id = ?`, row.id) : this.ctx.storage.sql.exec(`INSERT OR REPLACE INTO ${row.table}(id, json) VALUES (?, ?)`, row.id, row.json);
        this.seq++; this.ctx.storage.sql.exec("INSERT OR REPLACE INTO meta(key, value) VALUES ('seq', ?)", String(this.seq));
        this.broadcast(JSON.stringify({ t: 'op', seq: this.seq, by: { name: s.name, color: s.color }, op: msg.op }), ws);
      }
    } catch (e) { this.reply(ws, `bad message: ${e.message}`); }
  }
  webSocketClose(ws) { this.sessions.delete(ws); this.broadcastPresence(); }
  webSocketError(ws) { this.sessions.delete(ws); this.broadcastPresence(); }

  reply(ws, message) { ws.send(JSON.stringify({ t: 'error', message })); }
  broadcast(data, except) { for (const ws of this.sessions.keys()) if (ws !== except) { try { ws.send(data); } catch { this.sessions.delete(ws); } } }
  presenceOf(s) { return { email: s.email, name: s.name, color: s.color, x: s.x, z: s.z, tool: s.tool, brush: s.brush, at: s.at }; }
  broadcastPresence() { this.broadcast(JSON.stringify({ t: 'presence', users: [...this.sessions.values()].map(s => this.presenceOf(s)) }), null); }

  async scheduleFlush() { if ((await this.ctx.storage.getAlarm()) === null) await this.ctx.storage.setAlarm(Date.now() + FLUSH_MS); }
  async alarm() { await this.flush(); }
  async flush() {
    const sql = this.ctx.storage.sql;
    for (const k of this.dirty) { const { layer, tx, tz } = parseTileKey(k); sql.exec('INSERT OR REPLACE INTO tiles(layer, tx, tz, data) VALUES (?, ?, ?, ?)', layer, tx, tz, tileBytes(layer === 0 ? this.state.terrain : this.state.fog, tx, tz).buffer); }
    this.dirty.clear();
    sql.exec("INSERT OR REPLACE INTO meta(key, value) VALUES ('seq', ?)", String(this.seq));
  }
}
