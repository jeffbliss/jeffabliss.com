// Replace the whole map with a document (the shape Export writes): the difference goes out as ordinary ops, so
// the server and every friend follow, and this client's state is swapped in place. Not undoable; history is cleared.
import { createState } from './store.js';
import { pinOps } from './pins.js';

export const TILE = 128;

/** Ops turning `state` into `next`, plus `apply()` that mutates `state` to match. Only raster tiles that differ are sent. */
export function replaceOps(state, next) {
  const ops = [];
  const rasters = [['terrain', 0], ['fog', 1]];
  for (const [name, layer] of rasters) {
    const cur = state[name], inc = next[name], tiles = cur.cells / TILE;
    for (let tz = 0; tz < tiles; tz++) for (let tx = 0; tx < tiles; tx++) {
      const rect = { x0: tx * TILE, z0: tz * TILE, x1: tx * TILE + TILE - 1, z1: tz * TILE + TILE - 1 };
      const a = cur.snapshot(rect), b = inc.snapshot(rect);
      let same = true; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) { same = false; break; }
      if (!same) ops.push({ type: 'raster', layer, rect, bytes: b });
    }
  }
  for (const s of state.ink) ops.push({ type: 'ink.remove', id: s.id });
  for (const s of next.ink) ops.push({ type: 'ink.add', stroke: s });
  for (const p of state.pins) if (!p.fixed) ops.push(...pinOps.remove(p).ops);
  for (const p of next.pins) if (!p.fixed) ops.push(...pinOps.add(p).ops);
  const apply = () => {
    for (const op of ops) if (op.type === 'raster') state[op.layer === 0 ? 'terrain' : 'fog'].restore(op.rect, op.bytes);
    state.ink.splice(0, state.ink.length, ...next.ink);
    state.pins.splice(0, state.pins.length, ...state.pins.filter(p => p.fixed), ...next.pins.filter(p => !p.fixed));
  };
  return { ops, apply };
}

/** Parses a document file into a state, or throws with a readable message. */
export async function parseDocument(text) {
  let doc; try { doc = JSON.parse(text); } catch { throw new Error('not a JSON file'); }
  if (!doc || typeof doc !== 'object' || !('fog' in doc)) throw new Error('not a mapper export');
  return createState(doc);
}

/** Wires the Import button: pick a file, confirm, replace, send, clear history. */
export function wireImport(app, sync, button) {
  const input = Object.assign(document.createElement('input'), { type: 'file', accept: 'application/json,.json', hidden: true });
  document.body.append(input);
  button.onclick = () => { input.value = ''; input.click(); button.blur(); };
  input.onchange = async () => {
    const file = input.files?.[0]; if (!file) return;
    let next;
    try { next = await parseDocument(await file.text()); } catch (e) { app.toast(`Import failed: ${e.message}`, 4000); return; }
    if (!confirm(`Replace the whole map with ${file.name}? Everything on it now is erased for everyone. This cannot be undone.`)) return;
    const { ops, apply } = replaceOps(app.state, next);
    apply(); sync.sendOps(ops); app.history.clear(); app.pinsLayer.selected = null;
    app.markDirty(); app.requestRender();
    app.toast(`Imported ${file.name}: ${ops.filter(o => o.type === 'raster').length} tiles, ${next.pins.filter(p => !p.fixed).length} pins`, 5000);
  };
}
