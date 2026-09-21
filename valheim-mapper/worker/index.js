import { identityFromRequest } from './access.js';
export { MapRoom } from './map.js';

const PREFIX = '/valheim-mapper';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === PREFIX) return Response.redirect(`${url.origin}${PREFIX}/${url.search}`, 301);
    if (!url.pathname.startsWith(PREFIX + '/')) return new Response('not found', { status: 404 });
    let email;
    try { ({ email } = await identityFromRequest(request, env)); } catch (e) { return new Response(`forbidden: ${e.message}`, { status: 403 }); }
    if (url.pathname === `${PREFIX}/api/ws`) {
      if (request.headers.get('upgrade') !== 'websocket') return new Response('expected websocket', { status: 426 });
      const headers = new Headers(request.headers); headers.set('x-user-email', email);
      return env.MAP.getByName('main').fetch(new Request(request.url, { headers }));
    }
    const assetUrl = new URL(request.url); assetUrl.pathname = url.pathname.slice(PREFIX.length) || '/';
    return env.ASSETS.fetch(new Request(assetUrl, request));
  },
};
