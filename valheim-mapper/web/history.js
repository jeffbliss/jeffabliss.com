export function createHistory({ limit = 200 } = {}) {
  const undos = [], redos = [];
  const h = { onChange: null, onApply: null };
  const changed = () => h.onChange?.();
  h.push = cmd => { undos.push(cmd); if (undos.length > limit) undos.shift(); redos.length = 0; h.onApply?.(cmd.ops ?? []); changed(); };
  h.undo = () => { const c = undos.pop(); if (!c) return false; c.undo(); redos.push(c); h.onApply?.(c.inverseOps ?? []); changed(); return true; };
  h.redo = () => { const c = redos.pop(); if (!c) return false; c.redo(); undos.push(c); h.onApply?.(c.ops ?? []); changed(); return true; };
  h.canUndo = () => undos.length > 0;
  h.canRedo = () => redos.length > 0;
  h.clear = () => { undos.length = 0; redos.length = 0; changed(); };
  return h;
}

/** One command that applies several sub-commands together (undo runs them in reverse). */
export function combine(label, ...cmds) {
  const list = cmds.filter(Boolean);
  if (!list.length) return null;
  const ops = list.flatMap(c => c.ops ?? []), inverseOps = [...list].reverse().flatMap(c => c.inverseOps ?? []);
  if (list.length === 1) return { ...list[0], label, ops, inverseOps };
  return { label, ops, inverseOps, undo: () => { for (const c of [...list].reverse()) c.undo(); }, redo: () => { for (const c of list) c.redo(); } };
}

/** Records one brush stroke on a raster as a single command. */
export function createStrokeRecorder(raster, layerName) {
  let copy = null, startVersion = 0;
  return {
    begin() { copy = raster.data.slice(); startVersion = raster.version; raster.takeTouched(); },
    end(label) {
      const rect = raster.takeTouched();
      if (!copy || !rect || raster.version === startVersion) { copy = null; return null; }
      const after = raster.snapshot(rect);
      const before = createRasterLike(raster, copy).snapshot(rect);
      copy = null;
      return { label, ops: [{ type: 'raster', layer: layerName, rect, bytes: after }], inverseOps: [{ type: 'raster', layer: layerName, rect, bytes: before }],
        undo: () => raster.restore(rect, before), redo: () => raster.restore(rect, after) };
    },
  };
}
function createRasterLike(r, data) {
  return { snapshot: rect => {
    const w = rect.x1 - rect.x0 + 1, h = rect.z1 - rect.z0 + 1, out = new Uint8Array(w * h);
    for (let z = 0; z < h; z++) { const o = (rect.z0 + z) * r.cells + rect.x0; out.set(data.subarray(o, o + w), z * w); }
    return out;
  } };
}
