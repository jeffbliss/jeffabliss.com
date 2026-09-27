#!/usr/bin/env node
// Paints biomes onto the explored cells of a mapper document from a rendered seed map (valheim-map.world,
// "Biomes Only" layer with the flat palette below, whole world, north up). Only cells whose fog is revealed are painted.
//   node scripts/paint-biomes.mjs [doc=import/world.json] [image=import/seed-map.png]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { decodeRgbPng, palette, classify, sampler, paintExplored, calibrate } from './lib/biomeimage.mjs';
import { encodeGray, decodeGray, toBase64, fromBase64 } from '../web/png.js';
import { CELLS, CELL_M } from '../web/world.js';

const docPath = process.argv[2] ?? 'import/world.json', imgPath = process.argv[3] ?? 'import/seed-map.png';
const metaPath = docPath.replace(/\.json$/, '') + '.meta.json';
const shift = existsSync(metaPath) ? JSON.parse(readFileSync(metaPath, 'utf8')).shift : { dx: 0, dz: 0 };

// The flat colours set in the generator's preferences → mapper biome ids (web/world.js BIOMES). Shallows count as ocean.
const PALETTE = palette({ '#00ff00': 1, '#006400': 2, '#8b4513': 3, '#ffffff': 4, '#ffff00': 5, '#800080': 6, '#ff0000': 7, '#00ffff': 8, '#000080': 9, '#0000ff': 9 });
const WORLD_M = 24576;                                   // the generator renders the minimap extent: 2048 px × 12 m

const doc = JSON.parse(readFileSync(docPath, 'utf8'));
const fog = (await decodeGray(fromBase64(doc.fog))).data;
const img = decodeRgbPng(new Uint8Array(readFileSync(imgPath)));
const cls = classify(img, PALETTE, { maxDist: 40 });
const mppGuess = WORLD_M / img.width;
console.log(`${imgPath}: ${img.width}×${img.height}, ${mppGuess.toFixed(3)} m/px if it spans ${WORLD_M} m; shift (${shift.dx}, ${shift.dz})`);

const fixed = { metresPerPixel: mppGuess, cx: shift.dx, cz: shift.dz };
const fit = calibrate(cls, fog, { mppGuess, mppRange: 0.05, mppSteps: 11, shiftRange: 96, shiftStep: 16, cells: CELLS, cellM: CELL_M, sampleEvery: 3 });
const scoreOf = cal => { const s = sampler(cls, cal); let land = 0, n = 0; for (let cz = 0; cz < CELLS; cz += 3) for (let cx = 0; cx < CELLS; cx += 3) if (fog[cz * CELLS + cx] === 255) { n++; const id = s((cx + 0.5) * CELL_M - WORLD_M / 2 * (CELLS * CELL_M / WORLD_M), (cz + 0.5) * CELL_M - CELLS * CELL_M / 2); if (id !== 255 && id !== 9) land++; } return land / n; };
console.log(`assumed geometry: land share under explored cells ${(scoreOf(fixed) * 100).toFixed(1)}%; best fit ${JSON.stringify(fit)} (offset from assumed: ${(fit.cx - shift.dx).toFixed(0)}, ${(fit.cz - shift.dz).toFixed(0)} m, scale ×${(fit.metresPerPixel / mppGuess).toFixed(3)})`);
const cal = process.argv.includes('--fit') ? fit : fixed;

const terrain = new Uint8Array(CELLS * CELLS);
const counts = paintExplored(terrain, fog, sampler(cls, cal), { cells: CELLS, cellM: CELL_M });
const names = ['none', 'meadows', 'blackforest', 'swamp', 'mountain', 'plains', 'mistlands', 'ashlands', 'deepnorth', 'ocean'];
console.log('painted:', Object.entries(counts).map(([id, n]) => `${names[id]} ${n}`).join(', '));
doc.terrain = toBase64(await encodeGray(terrain, CELLS, CELLS));
writeFileSync(docPath, JSON.stringify(doc) + '\n');
console.log(`wrote ${docPath}`);
