// Wire format shared by the browser client and the Worker. No DOM, no Node APIs.
import { CELLS } from './world.js';

export const LAYER = { terrain: 0, fog: 1 };
export const LAYER_NAME = ['terrain', 'fog'];
const HEADER = 9;

export const rectArea = r => (r.x1 - r.x0 + 1) * (r.z1 - r.z0 + 1);
export const rectValid = (r, cells = CELLS) => [r.x0, r.z0, r.x1, r.z1].every(n => Number.isInteger(n) && n >= 0 && n < cells) && r.x1 >= r.x0 && r.z1 >= r.z0;

export function encodeRasterOp({ layer, rect, bytes }) {
  const code = typeof layer === 'string' ? LAYER[layer] : layer;
  const out = new Uint8Array(HEADER + bytes.length), dv = new DataView(out.buffer);
  out[0] = code; dv.setUint16(1, rect.x0, true); dv.setUint16(3, rect.z0, true); dv.setUint16(5, rect.x1, true); dv.setUint16(7, rect.z1, true);
  out.set(bytes, HEADER);
  return out;
}
export function decodeRasterOp(u8) {
  if (!(u8 instanceof Uint8Array)) u8 = new Uint8Array(u8);
  if (u8.length < HEADER) throw new Error('raster frame: too short');
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  const layer = u8[0], rect = { x0: dv.getUint16(1, true), z0: dv.getUint16(3, true), x1: dv.getUint16(5, true), z1: dv.getUint16(7, true) };
  if (layer > 1 || !rectValid(rect)) throw new Error('raster frame: bad layer or rect');
  if (u8.length - HEADER !== rectArea(rect)) throw new Error('raster frame: length mismatch');
  return { layer, rect, bytes: u8.subarray(HEADER) };
}

export function wrapServerRaster(seq, name, payload) {
  const nameBytes = new TextEncoder().encode(name).subarray(0, 255);
  const out = new Uint8Array(5 + nameBytes.length + payload.length);
  new DataView(out.buffer).setUint32(0, seq, true); out[4] = nameBytes.length; out.set(nameBytes, 5); out.set(payload, 5 + nameBytes.length);
  return out;
}
export function unwrapServerRaster(u8) {
  if (!(u8 instanceof Uint8Array)) u8 = new Uint8Array(u8);
  const seq = new DataView(u8.buffer, u8.byteOffset).getUint32(0, true), n = u8[4];
  return { seq, name: new TextDecoder().decode(u8.subarray(5, 5 + n)), payload: u8.subarray(5 + n) };
}

export function identityFromEmail(email) {
  let h = 0; for (const ch of email.toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return { email, name: email.split('@')[0].slice(0, 24) || 'anon', color: `hsl(${(h % 12) * 30} 70% 55%)` };
}
