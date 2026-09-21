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
  assert.deepEqual(await identityFromRequest(new Request('http://localhost/valheim-mapper/'), env), { email: 'dev@localhost' });
  assert.deepEqual(await identityFromRequest(new Request('http://127.0.0.1/valheim-mapper/?as=b@x'), env), { email: 'b@x' });
  await assert.rejects(identityFromRequest(new Request('http://localhost/'), { ACCESS_TEAM: 't', ACCESS_AUD: 'a' }), /token/);
});
test('DEV_IDENTITY is ignored off localhost, and missing team/aud denies', async () => {
  await assert.rejects(identityFromRequest(new Request('https://jeffabliss.com/valheim-mapper/'), { DEV_IDENTITY: 'dev@localhost', ACCESS_TEAM: 't', ACCESS_AUD: 'a' }), /token/);
  await assert.rejects(identityFromRequest(new Request('https://jeffabliss.com/valheim-mapper/'), { DEV_IDENTITY: 'dev@localhost' }), /access not configured/);
});
test('unknown kids do not trigger a JWKS refetch per request', async () => {
  resetJwksCache(); const { sign, fetchFn, fetches } = await setup();
  const opts = { team: 'team1', aud: 'aud-1', fetchFn, now };
  await assert.rejects(verifyAccessJwt(await sign(claims, { alg: 'RS256', kid: 'x1' }), opts), /unknown signing key/);
  await assert.rejects(verifyAccessJwt(await sign(claims, { alg: 'RS256', kid: 'x2' }), opts), /unknown signing key/);
  assert.equal(fetches(), 1);
  await verifyAccessJwt(await sign(claims), opts);                      // the good kid was in that one fetch
  assert.equal(fetches(), 1);
  await assert.rejects(verifyAccessJwt(await sign(claims, { alg: 'RS256', kid: 'x3' }), { ...opts, now: now + 61_000 }), /unknown signing key/);
  assert.equal(fetches(), 2);                                          // ... but after 60 s one more refetch is allowed
});
test('concurrent cold-start callers share one JWKS fetch', async () => {
  resetJwksCache(); const { sign, fetchFn, fetches } = await setup();
  const slow = async url => { await new Promise(r => setTimeout(r, 20)); return fetchFn(url); };
  const opts = { team: 'team1', aud: 'aud-1', fetchFn: slow, now };
  const token = await sign(claims);
  const results = await Promise.all([verifyAccessJwt(token, opts), verifyAccessJwt(token, opts)]);
  assert.deepEqual(results, [{ email: 'a@example.com' }, { email: 'a@example.com' }]);
  assert.equal(fetches(), 1);
});
test('a failed JWKS fetch is retried immediately, not cached for 60 s', async () => {
  resetJwksCache(); const { sign, fetchFn, fetches } = await setup();
  let fail = true;
  const flaky = async url => { if (fail) { fail = false; throw new Error('network down'); } return fetchFn(url); };
  const opts = { team: 'team1', aud: 'aud-1', fetchFn: flaky, now };
  await assert.rejects(verifyAccessJwt(await sign(claims), opts), /network down/);
  assert.deepEqual(await verifyAccessJwt(await sign(claims), opts), { email: 'a@example.com' });   // same instant, no poisoning
  assert.equal(fetches(), 1);                                                                     // the failing attempt never reached fetchFn's counter
});
test('ignores JWKS entries that are not signing keys', async () => {
  resetJwksCache(); const { sign } = await setup();
  const { publicKey } = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
  const jwk = await crypto.subtle.exportKey('jwk', publicKey);
  const fetchFn = async () => ({ ok: true, json: async () => ({ keys: [{ ...jwk, kid: 'k1', alg: 'RS256', use: 'enc' }] }) });
  await assert.rejects(verifyAccessJwt(await sign(claims), { team: 'team1', aud: 'aud-1', fetchFn, now }), /unknown signing key/);
});
