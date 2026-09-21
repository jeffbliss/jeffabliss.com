// Cloudflare Access JWT verification with WebCrypto. Works in Workers and Node ≥ 20.
const cache = new Map();                       // team → { keys: Map<kid, CryptoKey>, fetchedAt, lastFetch, inflight }
export const resetJwksCache = () => cache.clear();
const MAX_AGE_MS = 3_600_000, REFETCH_MS = 60_000;

const b64uToBytes = s => { s = s.replace(/-/g, '+').replace(/_/g, '/'); const bin = atob(s + '='.repeat((4 - s.length % 4) % 4)); return Uint8Array.from(bin, c => c.charCodeAt(0)); };
const decodeJson = s => JSON.parse(new TextDecoder().decode(b64uToBytes(s)));

async function fetchKeys(team, fetchFn) {
  const res = await fetchFn(`https://${team}.cloudflareaccess.com/cdn-cgi/access/certs`);
  if (!res.ok) throw new Error('jwks fetch failed');
  const { keys } = await res.json(); const map = new Map();
  for (const k of keys) if (k.kty === 'RSA' && (k.alg ?? 'RS256') === 'RS256' && (k.use ?? 'sig') === 'sig') map.set(k.kid, await crypto.subtle.importKey('jwk', { kty: k.kty, n: k.n, e: k.e, alg: 'RS256', ext: true }, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']));
  return map;
}

async function keysFor(team, kid, fetchFn, now) {
  let entry = cache.get(team);
  const expired = !entry || now - entry.fetchedAt > MAX_AGE_MS;
  if (expired || !entry.keys.has(kid)) {
    // An unknown kid is the one thing an attacker can pick freely: don't let it drive one origin fetch per request.
    // Only a *successful* fetch arms this throttle, so a failed one is retryable immediately.
    if (!expired && now - entry.lastFetch < REFETCH_MS) throw new Error('unknown signing key');
    if (!entry) { entry = { keys: new Map(), fetchedAt: 0, lastFetch: 0, inflight: null }; cache.set(team, entry); }
    // Concurrent cold-start callers await one shared fetch; clearing it in `finally` keeps a
    // failure out of the cache instead of poisoning it for the refetch window.
    entry.inflight ??= fetchKeys(team, fetchFn)
      .then(keys => { entry.keys = keys; entry.fetchedAt = now; entry.lastFetch = now; })
      .finally(() => { entry.inflight = null; });
    await entry.inflight;
  }
  const key = entry.keys.get(kid); if (!key) throw new Error('unknown signing key');
  return key;
}

export async function verifyAccessJwt(token, { team, aud, fetchFn = fetch, now = Date.now() }) {
  if (!team || !aud) throw new Error('access not configured');
  const parts = typeof token === 'string' ? token.split('.') : [];
  if (parts.length !== 3) throw new Error('missing or malformed token');
  let header, claims; try { header = decodeJson(parts[0]); claims = decodeJson(parts[1]); } catch { throw new Error('malformed token'); }
  if (header.alg !== 'RS256') throw new Error('unsupported alg');
  const key = await keysFor(team, header.kid, fetchFn, now);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64uToBytes(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
  if (!ok) throw new Error('bad signature');
  if (claims.iss !== `https://${team}.cloudflareaccess.com`) throw new Error('bad iss');
  const auds = Array.isArray(claims.aud) ? claims.aud : [claims.aud]; if (!auds.includes(aud)) throw new Error('bad aud');
  if (typeof claims.exp !== 'number' || claims.exp * 1000 <= now) throw new Error('token expired (exp)');
  if (typeof claims.email !== 'string' || !claims.email) throw new Error('no email claim');
  return { email: claims.email };
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

/** Who is making this request: Access token in production, DEV_IDENTITY (with ?as= override) in local dev. */
export async function identityFromRequest(request, env) {
  const url = new URL(request.url);
  // DEV_IDENTITY is a local-dev convenience only: a stray binding in production must not become an auth bypass.
  if (env.DEV_IDENTITY && LOCAL_HOSTS.has(url.hostname)) { const as = url.searchParams.get('as'); return { email: as && as.includes('@') ? as : env.DEV_IDENTITY }; }
  return verifyAccessJwt(request.headers.get('cf-access-jwt-assertion') ?? '', { team: env.ACCESS_TEAM, aud: env.ACCESS_AUD });
}
