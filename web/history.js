export function createHistory({ limit = 200 } = {}) {
  const undos = [], redos = [];
  const h = { onChange: null };
  const changed = () => h.onChange?.();
  h.push = cmd => { undos.push(cmd); if (undos.length > limit) undos.shift(); redos.length = 0; changed(); };
  h.undo = () => { const c = undos.pop(); if (!c) return false; c.undo(); redos.push(c); changed(); return true; };
  h.redo = () => { const c = redos.pop(); if (!c) return false; c.redo(); undos.push(c); changed(); return true; };
  h.canUndo = () => undos.length > 0;
  h.canRedo = () => redos.length > 0;
  h.clear = () => { undos.length = 0; redos.length = 0; changed(); };
  return h;
}

/** Records one brush stroke on a raster as a single command. */
export function createStrokeRecorder(raster) {
  let copy = null, startVersion = 0;
  return {
    begin() { copy = raster.data.slice(); startVersion = raster.version; raster.dirty = null; },
    end(label) {
      const rect = raster.dirty;
      if (!copy || !rect || raster.version === startVersion) { copy = null; return null; }
      const after = raster.snapshot(rect);
      const before = createRasterLike(raster, copy).snapshot(rect);
      copy = null;
      return { label, undo: () => raster.restore(rect, before), redo: () => raster.restore(rect, after) };
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
