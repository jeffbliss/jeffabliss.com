// Minimal 8-bit grayscale PNG encoder/decoder. Pure JS; relies on CompressionStream (Node 18+, all browsers).
const SIG = Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10);
const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0;
});
function crc32(bytes) { let c = -1; for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8); return (c ^ -1) >>> 0; }
function concat(parts) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0)); let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; } return out;
}
async function pipe(bytes, stream) {
  return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());
}
function chunk(type, data) {
  const out = new Uint8Array(12 + data.length), dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

export async function encodeGray(data, width, height) {
  const stride = width + 1, raw = new Uint8Array(stride * height);
  for (let y = 0; y < height; y++) raw.set(data.subarray(y * width, (y + 1) * width), y * stride + 1); // filter 0 per row
  const ihdr = new Uint8Array(13), dv = new DataView(ihdr.buffer);
  dv.setUint32(0, width); dv.setUint32(4, height); ihdr[8] = 8; ihdr[9] = 0; // 8-bit, grayscale
  const idat = await pipe(raw, new CompressionStream('deflate'));
  return concat([SIG, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', new Uint8Array(0))]);
}

const paeth = (a, b, c) => { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); return pa <= pb && pa <= pc ? a : pb <= pc ? b : c; };

export async function decodeGray(png) {
  if (png.length < 8 || !SIG.every((b, i) => png[i] === b)) throw new Error('png: bad signature');
  let pos = 8, width = 0, height = 0; const idats = [];
  while (pos + 12 <= png.length) {
    const dv = new DataView(png.buffer, png.byteOffset + pos);
    const len = dv.getUint32(0), type = String.fromCharCode(png[pos + 4], png[pos + 5], png[pos + 6], png[pos + 7]);
    const data = png.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = dv.getUint32(8); height = dv.getUint32(12);
      if (data[8] !== 8 || data[9] !== 0) throw new Error('png: expected 8-bit grayscale');
      if (width * height > 64 * 1024 * 1024) throw new Error('png: image too large');
    } else if (type === 'IDAT') idats.push(data);
    pos += 12 + len;
  }
  const raw = await pipe(concat(idats), new DecompressionStream('deflate'));
  const out = new Uint8Array(width * height), stride = width + 1;
  for (let y = 0; y < height; y++) {
    const f = raw[y * stride], row = raw.subarray(y * stride + 1, (y + 1) * stride);
    const dst = out.subarray(y * width, (y + 1) * width), prev = y ? out.subarray((y - 1) * width, y * width) : null;
    for (let x = 0; x < width; x++) {
      const a = x ? dst[x - 1] : 0, b = prev ? prev[x] : 0, c = x && prev ? prev[x - 1] : 0;
      const p = f === 1 ? a : f === 2 ? b : f === 3 ? (a + b) >> 1 : f === 4 ? paeth(a, b, c) : 0;
      dst[x] = (row[x] + p) & 0xff;
    }
  }
  return { data: out, width, height };
}

export function toBase64(bytes) {
  if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64');
  let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
export function fromBase64(str) {
  if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(str, 'base64'));
  const s = atob(str), out = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i); return out;
}
