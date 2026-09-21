export function createLayers() {
  const list = [];
  const L = { list };
  L.add = layer => { const l = Object.assign({ visible: true, opacity: 1 }, layer); list.push(l); return l; };
  L.get = id => list.find(l => l.id === id);
  L.insertBefore = (id, layer) => { const l = Object.assign({ visible: true, opacity: 1 }, layer); const i = list.findIndex(x => x.id === id); list.splice(i < 0 ? list.length : i, 0, l); return l; };
  L.draw = (ctx, view, w, h) => {
    for (const l of list) {
      if (!l.visible || l.opacity <= 0) continue;
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = l.opacity;
      l.draw(ctx, view, w, h);
      ctx.restore();
    }
  };
  L.settings = () => Object.fromEntries(list.map(l => [l.id, { visible: l.visible, opacity: l.opacity }]));
  L.applySettings = s => { for (const l of list) if (s?.[l.id]) Object.assign(l, s[l.id]); };
  return L;
}

const scratch = new Map();
/** Screen-sized offscreen canvas, cached by key. */
export function scratchCanvas(key, w, h) {
  let c = scratch.get(key);
  if (!c) { c = document.createElement('canvas'); scratch.set(key, c); }
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  return c;
}

/** Pattern whose tile spans tileM metres when filled under a world transform. */
export function worldPattern(ctx, image, tileM) {
  const p = ctx.createPattern(image, 'repeat');
  p.setTransform(new DOMMatrix().scale(tileM / image.width));
  return p;
}
