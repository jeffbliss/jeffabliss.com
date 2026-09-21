import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verifyAccessJwt, resetJwksCache, identityFromRequest } from '../worker/access.js';

const b64u = buf => Buffer.from(buf).toString('base64url');
async function setup() {
  const { publicKey, privateKey } = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
  const jwk = await crypto.subtle.exportKey('jwk', publicKey);
  const kid = 'k1';
  const sign = async (claims, header = { alg: 'RS256', kid, typ: 'JWT' }) => {
    const data = `${b64u(JSON.stringify(header))}.${b64u(JSON.stringify(claims))}`;
    const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', privateKey, new TextEncoder().encode(data));
    return `${data}.${b64u(sig)}`;
  };
  let fetches = 0;
  const fetchFn = async url => { fetches++; assert.equal(url, 'https://team1.cloudflareaccess.com/cdn-cgi/access/certs'); return { ok: true, json: async () => ({ keys: [{ ...jwk, kid, alg: 'RS256', use: 'sig' }] }) }; };
  return { sign, fetchFn, fetches: () => fetches };
}
const now = 1_800_000_000_000, claims = { aud: ['aud-1'], email: 'a@example.com', iss: 'https://team1.cloudflareaccess.com', exp: now / 1000 + 600, iat: now / 1000 };

test('valid token yields the email and caches the JWKS', async () => {
  resetJwksCache(); const { sign, fetchFn, fetches } = await setup();
  const opts = { team: 'team1', aud: 'aud-1', fetchFn, now };
  assert.deepEqual(await verifyAccessJwt(await sign(claims), opts), { email: 'a@example.com' });
  await verifyAccessJwt(await sign(claims), opts); assert.equal(fetches(), 1);
});
test('rejects wrong aud, wrong iss, expired, bad signature, bad alg, missing', async () => {
  resetJwksCache(); const { sign, fetchFn } = await setup(); const opts = { team: 'team1', aud: 'aud-1', fetchFn, now };
  await assert.rejects(verifyAccessJwt(await sign({ ...claims, aud: ['other'] }), opts), /aud/);
  await assert.rejects(verifyAccessJwt(await sign({ ...claims, iss: 'https://evil.cloudflareaccess.com' }), opts), /iss/);
  await assert.rejects(verifyAccessJwt(await sign({ ...claims, exp: now / 1000 - 1 }), opts), /exp/);
  const t = await sign(claims); await assert.rejects(verifyAccessJwt(t.slice(0, -4) + 'AAAA', opts), /signature/);
  await assert.rejects(verifyAccessJwt(await sign(claims, { alg: 'HS256', kid: 'k1' }), opts), /alg/);
  await assert.rejects(verifyAccessJwt('', opts), /token/);
  await assert.rejects(verifyAccessJwt(await sign(claims, { alg: 'RS256', kid: 'unknown' }), opts), /key/);
});
test('identityFromRequest: dev identity with ?as override, else header required', async () => {
  const env = { DEV_IDENTITY: 'dev@localhost' };
  assert.deepEqual(await identityFromRequest(new Request('http://x/valheim-mapper/'), env), { email: 'dev@localhost' });
  assert.deepEqual(await identityFromRequest(new Request('http://x/valheim-mapper/?as=b@x'), env), { email: 'b@x' });
  await assert.rejects(identityFromRequest(new Request('http://x/'), { ACCESS_TEAM: 't', ACCESS_AUD: 'a' }), /token/);
});
