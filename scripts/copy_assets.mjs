// Copies extracted game assets from out/assets into web/assets. Run: npm run assets
import { cp, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';

const SRC = 'out/assets/Assets';
const MAP_SRC = path.join(SRC, 'UI/map');
const FONT_SRC = path.join(SRC, '3rd party/TextMesh Pro/Resources/Fonts');
const FONTS = ['Norse/Norse.otf', 'Norse/Norsebold.otf',
  'Averia_Serif_Libre/AveriaSerifLibre-Regular.ttf', 'Averia_Serif_Libre/AveriaSerifLibre-Bold.ttf'];

await mkdir('web/assets/map', { recursive: true });
await mkdir('web/assets/fonts', { recursive: true });
let n = 0;
for (const f of await readdir(MAP_SRC)) {
  if (!f.endsWith('.png')) continue;
  const dest = f.replace(/\.sprite\.png$/, '.png');           // mapicon_pin.sprite.png -> mapicon_pin.png
  if (f.endsWith('.png') && !f.endsWith('.sprite.png') && f.startsWith('mapicon_')) continue; // prefer sprite (trimmed) version
  await cp(path.join(MAP_SRC, f), path.join('web/assets/map', dest)); n++;
}
for (const f of FONTS) { await cp(path.join(FONT_SRC, f), path.join('web/assets/fonts', path.basename(f))); n++; }
console.log(`copied ${n} files to web/assets/`);
