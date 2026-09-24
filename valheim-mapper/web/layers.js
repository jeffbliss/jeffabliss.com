export function createLayers() {
  const list = [];
  const L = { list };
  const wrap = layer => Object.defineProperties({ visible: true, opacity: 1 }, Object.getOwnPropertyDescriptors(layer));
  L.add = layer => { const l = wrap(layer); list.push(l); return l; };
  L.get = id => list.find(l => l.id === id);
  L.insertBefore = (id, layer) => { const l = wrap(layer); const i = list.findIndex(x => x.id === id); list.splice(i < 0 ? list.length : i, 0, l); return l; };
  L.draw = (ctx, view, w, h) => {
    for (const l of list) {
      if (!l.visible || l.opacity <= 0) continue;
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = l.opacity;
      l.draw(ctx, view, w, h);
      ctx.restore();
    }
  };
  L.settings = () => Object.fromEntries(list.map(l => [l.id, { visible: l.visible }]));
  L.applySettings = s => { for (const l of list) if (s?.[l.id]) { Object.assign(l, s[l.id]); l.opacity = 1; } };
  return L;
}
