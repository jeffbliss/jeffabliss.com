export const WORLD_SIZE = 20480;              // metres, square side
export const WORLD_HALF = WORLD_SIZE / 2;
export const WORLD_RADIUS = 10000;            // game's playable circle
export const CELL_M = 8;                      // raster cell size in metres
export const CELLS = WORLD_SIZE / CELL_M;     // 2560
export const ZONE_M = 64;                     // game zone size, default grid spacing
export const EXPLORE_RADIUS = 100;            // in-game map reveal radius

// Colours from decompiled Minimap.cs (m_*Color). Ocean uses _WaterColorDeep from the minimap material (minimap.mat).
export const BIOMES = [
  { id: 0, key: 'none',        name: 'None',         color: null,              detail: null },
  { id: 1, key: 'meadows',     name: 'Meadows',      color: [0.45, 1, 0.43],   detail: null },
  { id: 2, key: 'blackforest', name: 'Black Forest', color: [0, 0.7, 0],       detail: 'forest' },
  { id: 3, key: 'swamp',       name: 'Swamp',        color: [0.6, 0.5, 0.5],   detail: null },
  { id: 4, key: 'mountain',    name: 'Mountain',     color: [1, 1, 1],         detail: 'mountain' },
  { id: 5, key: 'plains',      name: 'Plains',       color: [1, 1, 0.2],       detail: null },
  { id: 6, key: 'mistlands',   name: 'Mistlands',    color: [0.2, 0.2, 0.2],   detail: 'forest' },
  { id: 7, key: 'ashlands',    name: 'Ashlands',     color: [1, 0.2, 0.2],     detail: null },
  { id: 8, key: 'deepnorth',   name: 'Deep North',   color: [1, 1, 1],         detail: 'mountain' },
  { id: 9, key: 'ocean',       name: 'Ocean',        color: [0.343, 0.534, 0.765], detail: 'water' },
];

export const PIN_TYPES = ['pin', 'fire', 'house', 'hammer', 'portal', 'bed', 'boss', 'trader',
  'death', 'eventarea', 'upgradestation', 'memorialplace', 'start'];

// Metres covered by one repeat of each texture tile.
export const TILE_M = { background: 512, space: 2048, forest: 256, mountain: 256, water: 128, fog: 512 };
