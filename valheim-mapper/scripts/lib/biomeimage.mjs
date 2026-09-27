// Biomes from a rendered seed map: decode an 8-bit RGB/RGBA PNG, classify each pixel by nearest palette colour, and
// resample onto the mapper's terrain grid. Pure functions; the CLI wires files. The image is assumed to be a square
// render of the whole world, north up, centred on the world origin; `calibrate` finds its scale and offset by matching
// land against the explored fog.
import { inflateSync } from 'node:zlib';
import { CELLS, CELL_M } from '../../web/world.js';

const SIG = [137, 80, 78, 71, 13, 10, 26, 10];
const paeth = (a, b, c) => { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); return pa <= pb && pa <= pc ? a : pb <= pc ? b : c; };

/** Decodes an 8-bit truecolour PNG (RGB or RGBA, non-interlaced) into { width, height, rgb: Uint8Array(3·w·h) }. */
export function decodeRgbPng(png) {
  if (!SIG.every((b, i) => png[i] === b)) throw new Error('png: bad signature');
  let pos = 8, width = 0, height = 0, channels = 0; const idats = [];
  while (pos + 12 <= png.length) {
    const dv = new DataView(png.buffer, png.byteOffset + pos), len = dv.getUint32(0);
    const type = String.fromCharCode(png[pos + 4], png[pos + 5], png[pos + 6], png[pos + 7]), data = png.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = dv.getUint32(8); height = dv.getUint32(12);
      const depth = data[8], colour = data[9], interlace = data[12];
      if (depth !== 8 || (colour !== 2 && colour !== 6) || interlace) throw new Error(`png: need 8-bit RGB/RGBA non-interlaced, got depth ${depth} colour ${colour} interlace ${interlace}`);
      channels = colour === 6 ? 4 : 3;
    } else if (type === 'IDAT') idats.push(data);
    pos += 12 + len;
  }
  const total = idats.reduce((n, d) => n + d.length, 0), z = new Uint8Array(total); let o = 0; for (const d of idats) { z.set(d, o); o += d.length; }
  const raw = inflateSync(z), bpp = channels, stride = width * bpp + 1, out = new Uint8Array(width * height * bpp);
  for (let y = 0; y < height; y++) {
    const f = raw[y * stride], row = raw.subarray(y * stride + 1, (y + 1) * stride), dst = out.subarray(y * width * bpp, (y + 1) * width * bpp);
    const prev = y ? out.subarray((y - 1) * width * bpp, y * width * bpp) : null;
    for (let x = 0; x < row.length; x++) {
      const a = x >= bpp ? dst[x - bpp] : 0, b = prev ? prev[x] : 0, c = x >= bpp && prev ? prev[x - bpp] : 0;
      const p = f === 1 ? a : f === 2 ? b : f === 3 ? (a + b) >> 1 : f === 4 ? paeth(a, b, c) : 0;
      dst[x] = (row[x] + p) & 0xff;
    }
  }
  if (channels === 3) return { width, height, rgb: out };
  const rgb = new Uint8Array(width * height * 3);
  for (let i = 0, j = 0; i < out.length; i += 4, j += 3) { rgb[j] = out[i]; rgb[j + 1] = out[i + 1]; rgb[j + 2] = out[i + 2]; }
  return { width, height, rgb };
}

/** Palette as [[r, g, b, biomeId]…] from '#rrggbb' → id. */
export const palette = colours => Object.entries(colours).map(([hex, id]) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16), id]);

/** Classifies every pixel to the nearest palette entry; pixels farther than `maxDist` from all entries become `unknown`. */
export function classify({ width, height, rgb }, pal, { maxDist = 60, unknown = 255 } = {}) {
  const ids = new Uint8Array(width * height), max2 = maxDist * maxDist;
  for (let i = 0; i < ids.length; i++) {
    const r = rgb[i * 3], g = rgb[i * 3 + 1], b = rgb[i * 3 + 2];
    let best = max2 + 1, id = unknown;
    for (const [pr, pg, pb, pid] of pal) { const d = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2; if (d < best) { best = d; id = pid; } }
    ids[i] = id;
  }
  return { width, height, ids };
}

/**
 * Biome id under a world point for an image whose pixel (0,0) is the north-west corner: x grows east, z grows north.
 * `metresPerPixel`, and the world coordinate of the image centre `(cx, cz)`, are the calibration.
 */
export function sampler(cls, { metresPerPixel, cx = 0, cz = 0 }) {
  const { width, height, ids } = cls, hw = width / 2, hh = height / 2;
  return (x, z) => {
    const px = Math.floor((x - cx) / metresPerPixel + hw), py = Math.floor(hh - (z - cz) / metresPerPixel);
    return px < 0 || py < 0 || px >= width || py >= height ? 255 : ids[py * width + px];
  };
}

/**
 * Paints biome ids onto a terrain raster (Uint8Array cells²) for every cell where `fog[k] === 255`, given a sampler.
 * Ocean and unknown pixels are skipped (left 0) unless `paintOcean`. Returns counts per biome id.
 */
export function paintExplored(terrain, fog, sample, { cells = CELLS, cellM = CELL_M, oceanId = 9, paintOcean = true } = {}) {
  const half = cells * cellM / 2, counts = {};
  for (let cz = 0; cz < cells; cz++) for (let cx = 0; cx < cells; cx++) {
    const k = cz * cells + cx; if (fog[k] !== 255) continue;
    const id = sample((cx + 0.5) * cellM - half, (cz + 0.5) * cellM - half);
    if (id === 255 || (!paintOcean && id === oceanId)) continue;
    terrain[k] = id; counts[id] = (counts[id] ?? 0) + 1;
  }
  return counts;
}

/**
 * Finds metresPerPixel and centre (cx, cz) that best explain the explored fog: explored cells should mostly be land
 * (not ocean) in the image. Searches a grid around the guesses and returns the best { metresPerPixel, cx, cz, score }.
 */
export function calibrate(cls, fog, { mppGuess, mppRange = 0.1, mppSteps = 21, shiftRange = 200, shiftStep = 20, cells = CELLS, cellM = CELL_M, oceanId = 9, sampleEvery = 4 } = {}) {
  const half = cells * cellM / 2, pts = [];
  for (let cz = 0; cz < cells; cz += sampleEvery) for (let cx = 0; cx < cells; cx += sampleEvery) if (fog[cz * cells + cx] === 255) pts.push([(cx + 0.5) * cellM - half, (cz + 0.5) * cellM - half]);
  let best = { score: -1 };
  for (let i = 0; i < mppSteps; i++) {
    const metresPerPixel = mppGuess * (1 - mppRange + 2 * mppRange * i / (mppSteps - 1));
    for (let cx = -shiftRange; cx <= shiftRange; cx += shiftStep) for (let cz = -shiftRange; cz <= shiftRange; cz += shiftStep) {
      const s = sampler(cls, { metresPerPixel, cx, cz }); let land = 0;
      for (const [x, z] of pts) { const id = s(x, z); if (id !== 255 && id !== oceanId) land++; }
      const score = land / pts.length;
      if (score > best.score) best = { metresPerPixel, cx, cz, score };
    }
  }
  return best;
}
