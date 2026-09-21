// Other people's cursors: a coloured dot, their name, and their brush circle while they paint.
const STALE_MS = 10_000;

/**
 * `getYou()` returns your own identity ({ email, ... }) so you are never drawn or chipped.
 * The server marks full rosters (join/leave) with `full: true`; cursor updates carry one
 * user and merge. The flag is explicit because a full roster can legitimately hold one user.
 */
export function createPresence(getYou) {
  const users = new Map();
  const p = {
    set(list, { full = false } = {}) {
      if (full) users.clear();
      for (const u of list) users.set(u.email, { ...users.get(u.email), ...u });
    },
    users: () => [...users.values()],
    others() { const me = getYou()?.email; return [...users.values()].filter(u => u.email !== me); },
    visible(now = Date.now()) {
      return p.others().filter(u => u.x != null && u.z != null && now - (u.at ?? 0) < STALE_MS);
    },
    layer: {
      id: 'presence', name: 'Friends',
      draw(ctx, view, w, h) {
        const dpr = globalThis.devicePixelRatio || 1;
        ctx.font = `bold ${Math.round(12 * dpr)}px Norse`;
        ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.lineWidth = 3 * dpr;
        for (const u of p.visible()) {
          const [sx, sy] = view.worldToScreen(u.x, u.z, w, h);
          if (u.tool === 'paint' && u.brush) {
            ctx.beginPath(); ctx.arc(sx, sy, u.brush * view.scale, 0, Math.PI * 2);
            ctx.strokeStyle = u.color; ctx.lineWidth = 1 * dpr;
            ctx.globalAlpha *= 0.6; ctx.stroke(); ctx.globalAlpha /= 0.6; ctx.lineWidth = 3 * dpr;
          }
          ctx.beginPath(); ctx.arc(sx, sy, 4 * dpr, 0, Math.PI * 2);
          ctx.fillStyle = u.color; ctx.fill();
          ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.strokeText(u.name ?? '', sx + 8 * dpr, sy);
          ctx.fillStyle = u.color; ctx.fillText(u.name ?? '', sx + 8 * dpr, sy);
        }
      },
    },
  };
  return p;
}
