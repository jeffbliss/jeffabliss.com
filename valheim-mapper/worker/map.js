// The one shared map: authoritative state in memory, tiles/rows in SQLite, WebSocket hub with hibernation.
import { DurableObject } from 'cloudflare:workers';
import { makeState, validateOp, validateRaster, planOp, applyOp, applyRaster, tileBytes, putTile, parseTileKey, snapshotDoc } from './ops.js';
import { decodeRasterOp, wrapServerRaster, identityFromEmail } from '../web/proto.js';

const FLUSH_MS = 2000;

export class MapRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.state = makeState(); this.seq = 0; this.dirty = new Set(); this.snapshot = null; this.sessions = new Map(); this.inPresence = false;
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
    if ((request.headers.get('upgrade') ?? '').toLowerCase() !== 'websocket') return new Response('expected websocket', { status: 426 });
    const email = request.headers.get('x-user-email'); if (!email) return new Response('no identity', { status: 403 });
    const who = identityFromEmail(email);
    if (this.dirty.size) { await this.flush(); await this.ctx.storage.deleteAlarm(); }
    // Snapshot before the socket exists, and retry if an op landed during the await: hello must be the first frame and must not be torn.
    let seq, doc; do { seq = this.seq; doc = await this.doc(); } while (seq !== this.seq);
    const pair = new WebSocketPair(), [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server); server.serializeAttachment(who);
    server.send(JSON.stringify({ t: 'hello', you: who, seq, doc }));
    this.sessions.set(server, { ...who, x: null, z: null, tool: null, brush: 0, at: 0 });
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
        // Persist first: if a write throws (e.g. the daily write limit) memory, SQLite and peers all stay on the old state.
        const { persist } = planOp(this.state, msg.op);
        const nextSeq = this.seq + 1;
        this.writeRows(persist, nextSeq);
        applyOp(this.state, msg.op); this.seq = nextSeq;
        this.broadcast(JSON.stringify({ t: 'op', seq: this.seq, by: { name: s.name, color: s.color }, op: msg.op }), ws);
      }
    } catch (e) {
      const detail = e?.message ?? String(e);
      if (e instanceof SyntaxError) return this.reply(ws, 'bad message');
      console.error('MapRoom message failed:', detail);
      this.reply(ws, 'internal error');
    }
  }

  /** All rows for one op plus the new seq, in a single synchronous unit of work. */
  writeRows(persist, nextSeq) {
    const sql = this.ctx.storage.sql;
    const write = () => {
      for (const row of persist) row.json === null ? sql.exec(`DELETE FROM ${row.table} WHERE id = ?`, row.id) : sql.exec(`INSERT OR REPLACE INTO ${row.table}(id, json) VALUES (?, ?)`, row.id, row.json);
      sql.exec("INSERT OR REPLACE INTO meta(key, value) VALUES ('seq', ?)", String(nextSeq));
    };
    this.ctx.storage.transactionSync ? this.ctx.storage.transactionSync(write) : write();
  }

  async webSocketClose(ws) { await this.dropSession(ws); }
  async webSocketError(ws) { await this.dropSession(ws); }
  async dropSession(ws) {
    this.sessions.delete(ws); this.broadcastPresence();
    if (this.sessions.size === 0 && this.dirty.size) await this.flush();
  }

  reply(ws, message) { try { ws.send(JSON.stringify({ t: 'error', message })); } catch (e) { console.error('MapRoom reply failed:', e?.message ?? String(e)); this.sessions.delete(ws); } }
  broadcast(data, except) {
    const dead = [];
    for (const ws of this.sessions.keys()) if (ws !== except) { try { ws.send(data); } catch { dead.push(ws); } }
    for (const ws of dead) this.sessions.delete(ws);
    if (dead.length && !this.inPresence) this.broadcastPresence();
  }
  presenceOf(s) { return { email: s.email, name: s.name, color: s.color, x: s.x, z: s.z, tool: s.tool, brush: s.brush, at: s.at }; }
  broadcastPresence() {
    this.inPresence = true;                      // a send failure inside this broadcast must not re-enter broadcastPresence
    try { this.broadcast(JSON.stringify({ t: 'presence', users: [...this.sessions.values()].map(s => this.presenceOf(s)) }), null); } finally { this.inPresence = false; }
  }

  async scheduleFlush() { if ((await this.ctx.storage.getAlarm()) === null) await this.ctx.storage.setAlarm(Date.now() + FLUSH_MS); }
  async alarm() { await this.flush(); }
  async flush() {
    const sql = this.ctx.storage.sql;
    for (const k of this.dirty) { const { layer, tx, tz } = parseTileKey(k); sql.exec('INSERT OR REPLACE INTO tiles(layer, tx, tz, data) VALUES (?, ?, ?, ?)', layer, tx, tz, tileBytes(layer === 0 ? this.state.terrain : this.state.fog, tx, tz).buffer); }
    this.dirty.clear();
    sql.exec("INSERT OR REPLACE INTO meta(key, value) VALUES ('seq', ?)", String(this.seq));
  }
}
