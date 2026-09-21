// WebGL renderer for the two raster layers. One shared offscreen GL canvas; each layer renders a
// full-screen quad into it and the result is drawn onto the main 2D canvas, so the 2D layers
// (grid, ink, pins) keep working unchanged. The biome and fog rasters live on the GPU as single-
// channel textures that are patched with texSubImage2D from the rasters' dirty rects.
import { BIOMES, WORLD_HALF, WORLD_RADIUS, TILE_M } from './world.js';

const TINT = 0.85, DETAIL = { forest: 0.55, mountain: 0.7, water: 0.5 };

const VS = `
attribute vec2 a_pos;
uniform vec3 u_view;     // camera x, camera z, scale (px per metre)
uniform vec2 u_size;     // canvas size in px
varying vec2 v_world;    // world metres (x east, z north)
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
  vec2 px = (a_pos * 0.5 + 0.5) * u_size;                       // clip +y is the top of the canvas = north
  v_world = u_view.xy + (px - u_size * 0.5) / u_view.z;
}`;

const TERRAIN_FS = `
precision highp float;
varying vec2 v_world;
uniform sampler2D u_biome, u_palette, u_bg, u_space, u_forest, u_mountain, u_water;
uniform float u_cells, u_half, u_radius;
uniform vec4 u_tiles;    // metres per tile: bg, space, forest/mountain, water
uniform vec3 u_detail;   // detail texture strengths: forest, mountain, water
// Per-cell lookup: palette row 0 = tint (rgb) + has-biome (a); row 1 = detail weights (forest, mountain, water).
void cell(vec2 c, out vec3 tint, out vec3 detail) {
  float id = texture2D(u_biome, (c + 0.5) / u_cells).r * 255.0;
  float u = (id + 0.5) / 16.0;
  vec4 p = texture2D(u_palette, vec2(u, 0.25));
  tint = mix(vec3(1.0), p.rgb, ${TINT.toFixed(2)} * p.a);
  detail = texture2D(u_palette, vec2(u, 0.75)).rgb;
}
void main() {
  vec2 cellf = (v_world + u_half) / (2.0 * u_half / u_cells) - 0.5;   // cell-space coordinate, row 0 = south
  vec2 c0 = floor(cellf), f = fract(cellf);
  vec3 t00, t10, t01, t11, d00, d10, d01, d11;
  cell(c0, t00, d00); cell(c0 + vec2(1, 0), t10, d10); cell(c0 + vec2(0, 1), t01, d01); cell(c0 + vec2(1, 1), t11, d11);
  vec3 tint = mix(mix(t00, t10, f.x), mix(t01, t11, f.x), f.y);          // one-cell soft blend between biomes
  vec3 d = mix(mix(d00, d10, f.x), mix(d01, d11, f.x), f.y);
  vec3 col = texture2D(u_bg, v_world / u_tiles.x).rgb * tint;
  col = mix(col, texture2D(u_forest, v_world / u_tiles.z).rgb, u_detail.x * d.r);
  col = mix(col, texture2D(u_mountain, v_world / u_tiles.z).rgb, u_detail.y * d.g);
  col = mix(col, texture2D(u_water, v_world / u_tiles.w).rgb, u_detail.z * d.b);
  vec3 space = texture2D(u_space, v_world / u_tiles.y).rgb;
  gl_FragColor = vec4(mix(space, col, step(length(v_world), u_radius)), 1.0);
}`;

const FOG_FS = `
precision highp float;
varying vec2 v_world;
uniform sampler2D u_fog, u_fogTex;
uniform float u_half, u_radius, u_tile;
void main() {
  float reveal = texture2D(u_fog, (v_world + u_half) / (2.0 * u_half)).r;
  float a = (1.0 - reveal) * step(length(v_world), u_radius);
  gl_FragColor = vec4(texture2D(u_fogTex, v_world / u_tile).rgb * a, a);   // premultiplied alpha
}`;

let shared = null;

/** Lazily creates the shared GL canvas, programs and game textures. Throws if WebGL is unavailable. */
function context(textures) {
  if (shared) return shared;
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false });
  if (!gl) throw new Error('WebGL is not available in this browser');
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  const tile = img => {
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    return t;
  };
  const tiles = Object.fromEntries(['background', 'space', 'forest', 'mountain', 'water', 'fog'].map(k => [k, tile(textures[k])]));
  shared = { canvas, gl, quad, tiles, palette: paletteTexture(gl),
    terrain: program(gl, VS, TERRAIN_FS), fog: program(gl, VS, FOG_FS) };
  return shared;
}

function program(gl, vs, fs) {
  const compile = (type, src) => {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(`shader: ${gl.getShaderInfoLog(s)}`);
    return s;
  };
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl.VERTEX_SHADER, vs)); gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(`program: ${gl.getProgramInfoLog(p)}`);
  const uniforms = {};
  for (let i = 0; i < gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); i++) { const n = gl.getActiveUniform(p, i).name; uniforms[n] = gl.getUniformLocation(p, n); }
  return { p, u: uniforms, a_pos: gl.getAttribLocation(p, 'a_pos') };
}

/** 16x2 RGBA lookup: row 0 = biome tint + has-biome flag, row 1 = detail weights (forest, mountain, water). */
export function paletteBytes() {
  const px = new Uint8Array(16 * 2 * 4);
  for (const b of BIOMES) {
    const i = b.id * 4, [r, g, bl] = b.color ?? [1, 1, 1];
    px.set([Math.round(r * 255), Math.round(g * 255), Math.round(bl * 255), b.color ? 255 : 0], i);
    px.set([b.detail === 'forest' ? 255 : 0, b.detail === 'mountain' ? 255 : 0, b.detail === 'water' ? 255 : 0, 255], 16 * 4 + i);
  }
  return px;
}
function paletteTexture(gl) {
  const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 16, 2, 0, gl.RGBA, gl.UNSIGNED_BYTE, paletteBytes());
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}

/** A raster mirrored into a single-channel GPU texture, patched from the raster's dirty rects. */
function rasterTexture(gl, raster, filter) {
  const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, raster.cells, raster.cells, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, raster.data);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  raster.takeDirty();
  return {
    texture: t,
    sync() {
      const d = raster.takeDirty(); if (!d) return;
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, d.x0, d.z0, d.x1 - d.x0 + 1, d.z1 - d.z0 + 1, gl.LUMINANCE, gl.UNSIGNED_BYTE, raster.snapshot(d));
    },
    dispose() { gl.deleteTexture(t); },
  };
}

/** Runs `prog` over the whole canvas with `bind(u)` setting its uniforms/textures, then blits to ctx. */
function pass(shared, prog, ctx, view, w, h, bind) {
  const { gl, canvas, quad } = shared;
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  gl.viewport(0, 0, w, h);
  gl.useProgram(prog.p);
  gl.bindBuffer(gl.ARRAY_BUFFER, quad); gl.enableVertexAttribArray(prog.a_pos); gl.vertexAttribPointer(prog.a_pos, 2, gl.FLOAT, false, 0, 0);
  gl.uniform3f(prog.u.u_view, view.x, view.z, view.scale); gl.uniform2f(prog.u.u_size, w, h);
  gl.uniform1f(prog.u.u_half, WORLD_HALF); gl.uniform1f(prog.u.u_radius, WORLD_RADIUS);
  bind(prog.u);
  gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  ctx.drawImage(canvas, 0, 0);
}
const bindTex = (gl, unit, tex, loc) => { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(loc, unit); };

/** Parchment + space + painted biomes, in one pass. */
export function createTerrainLayer(raster, textures) {
  const s = context(textures), { gl } = s, biome = rasterTexture(gl, raster, gl.NEAREST);
  return {
    id: 'terrain', name: 'Terrain', dispose: biome.dispose,
    draw(ctx, view, w, h) {
      biome.sync();
      pass(s, s.terrain, ctx, view, w, h, u => {
        gl.uniform1f(u.u_cells, raster.cells);
        gl.uniform4f(u.u_tiles, TILE_M.background, TILE_M.space, TILE_M.forest, TILE_M.water);
        gl.uniform3f(u.u_detail, DETAIL.forest, DETAIL.mountain, DETAIL.water);
        bindTex(gl, 0, biome.texture, u.u_biome); bindTex(gl, 1, s.palette, u.u_palette);
        bindTex(gl, 2, s.tiles.background, u.u_bg); bindTex(gl, 3, s.tiles.space, u.u_space);
        bindTex(gl, 4, s.tiles.forest, u.u_forest); bindTex(gl, 5, s.tiles.mountain, u.u_mountain); bindTex(gl, 6, s.tiles.water, u.u_water);
      });
    },
  };
}

/** Fog texture drawn where the reveal raster is still 0, faded by partial reveal. */
export function createFogLayer(raster, textures) {
  const s = context(textures), { gl } = s, fog = rasterTexture(gl, raster, gl.LINEAR);
  return {
    id: 'fog', name: 'Fog', dispose: fog.dispose,
    draw(ctx, view, w, h) {
      fog.sync();
      pass(s, s.fog, ctx, view, w, h, u => {
        gl.uniform1f(u.u_tile, TILE_M.fog);
        bindTex(gl, 0, fog.texture, u.u_fog); bindTex(gl, 1, s.tiles.fog, u.u_fogTex);
      });
    },
  };
}

