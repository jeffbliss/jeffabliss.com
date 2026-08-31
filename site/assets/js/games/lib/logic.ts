export interface Vec {
  x: number
  y: number
}

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

const KEY_DIRS: Record<string, Vec> = {
  arrowup: { x: 0, y: -1 },
  w: { x: 0, y: -1 },
  arrowdown: { x: 0, y: 1 },
  s: { x: 0, y: 1 },
  arrowleft: { x: -1, y: 0 },
  a: { x: -1, y: 0 },
  arrowright: { x: 1, y: 0 },
  d: { x: 1, y: 0 },
}

export function directionFromKeys(keys: ReadonlySet<string>): Vec {
  let x = 0
  let y = 0
  for (const key of keys) {
    const dir = KEY_DIRS[key]
    if (dir) {
      x += dir.x
      y += dir.y
    }
  }
  x = Math.sign(x)
  y = Math.sign(y)
  const len = Math.hypot(x, y)
  if (len === 0) return { x: 0, y: 0 }
  return { x: x / len, y: y / len }
}

function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

function blocked(feet: Rect, obstacles: Rect[]): boolean {
  return obstacles.some((o) => overlaps(feet, o))
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max)
}

export function stepPosition(
  feet: Rect,
  dir: Vec,
  speed: number,
  dt: number,
  bounds: Rect,
  obstacles: Rect[],
): Vec {
  const next = { x: feet.x, y: feet.y }
  const tryX = clamp(feet.x + dir.x * speed * dt, bounds.x, bounds.x + bounds.w - feet.w)
  if (!blocked({ ...feet, x: tryX }, obstacles)) next.x = tryX
  const tryY = clamp(feet.y + dir.y * speed * dt, bounds.y, bounds.y + bounds.h - feet.h)
  if (!blocked({ ...feet, x: next.x, y: tryY }, obstacles)) next.y = tryY
  return next
}

export function isNear(a: Vec, b: Vec, radius: number): boolean {
  return Math.hypot(a.x - b.x, a.y - b.y) <= radius
}
