// Cloudflare Access JWT verification with WebCrypto. Works in Workers and Node ≥ 20.
const cache = new Map();                       // team → { keys: Map<kid, CryptoKey>, fetchedAt }
export const resetJwksCache = () => cache.clear();

const b64uToBytes = s => { s = s.replace(/-/g, '+').replace(/_/g, '/'); const bin = atob(s + '='.repeat((4 - s.length % 4) % 4)); return Uint8Array.from(bin, c => c.charCodeAt(0)); };
const decodeJson = s => JSON.parse(new TextDecoder().decode(b64uToBytes(s)));

async function keysFor(team, kid, fetchFn, now) {
  let entry = cache.get(team);
  if (!entry || !entry.keys.has(kid) || now - entry.fetchedAt > 3_600_000) {
    const res = await fetchFn(`https://${team}.cloudflareaccess.com/cdn-cgi/access/certs`);
    if (!res.ok) throw new Error('jwks fetch failed');
    const { keys } = await res.json(); const map = new Map();
    for (const k of keys) if (k.kty === 'RSA' && (k.alg ?? 'RS256') === 'RS256') map.set(k.kid, await crypto.subtle.importKey('jwk', { kty: k.kty, n: k.n, e: k.e, alg: 'RS256', ext: true }, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']));
    entry = { keys: map, fetchedAt: now }; cache.set(team, entry);
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

/** Who is making this request: Access token in production, DEV_IDENTITY (with ?as= override) in local dev. */
export async function identityFromRequest(request, env) {
  if (env.DEV_IDENTITY) { const as = new URL(request.url).searchParams.get('as'); return { email: as && as.includes('@') ? as : env.DEV_IDENTITY }; }
  return verifyAccessJwt(request.headers.get('cf-access-jwt-assertion') ?? '', { team: env.ACCESS_TEAM, aud: env.ACCESS_AUD });
}
