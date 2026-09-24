// Copies extracted game assets from out/assets into web/assets. Run: npm run assets
import { cp, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';

const SRC = 'out/assets/Assets';
const MAP_SRC = path.join(SRC, 'UI/map');
const FONT_SRC = path.join(SRC, '3rd party/TextMesh Pro/Resources/Fonts');
const FONTS = ['Norse/Norse.otf', 'Norse/Norsebold.otf',
  'Averia_Serif_Libre/AveriaSerifLibre-Regular.ttf', 'Averia_Serif_Libre/AveriaSerifLibre-Bold.ttf'];

const GUI_SRC = path.join(SRC, 'UI/textures/small'), GUI = ['woodpanel_512x512', 'panel_interior_bkg_128', 'panel_bkg_128', 'button', 'button_highlight', 'button_pressed',
  'button_tab', 'button_tab_hover', 'button_tab_selected', 'text_field', 'text_field_highlight', 'checkbox', 'checkbox_marker', 'selection_frame', 'darken_blob',
  'BraidLineHorisontalMedium', 'panel_separator', 'check_yes', 'x_no'];

await mkdir('web/assets/gui', { recursive: true });
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
for (const g of GUI) {
  const files = (await readdir(GUI_SRC)).filter(f => f === `${g}.png` || f === `${g}.sprite.png`);
  const f = files.find(x => x.endsWith('.sprite.png')) ?? files[0]; if (!f) { console.warn(`missing gui sprite ${g}`); continue; }
  await cp(path.join(GUI_SRC, f), path.join('web/assets/gui', `${g}.png`)); n++;
}
for (const c of ['cursor.png', 'cursor.sprite.png']) { try { await cp(path.join(SRC, 'UI/textures', c), 'web/assets/gui/cursor.png'); n++; break; } catch { /* try the other name */ } }
console.log(`copied ${n} files to web/assets/`);
