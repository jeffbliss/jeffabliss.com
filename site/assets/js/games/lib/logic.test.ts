import { describe, expect, it } from "vitest"
import { directionFromKeys, isNear, stepPosition, type Rect } from "./logic"

const bounds: Rect = { x: 0, y: 0, w: 100, h: 100 }

describe("directionFromKeys", () => {
  it("returns zero vector with no keys held", () => {
    expect(directionFromKeys(new Set())).toEqual({ x: 0, y: 0 })
  })

  it("maps arrows and wasd to unit directions", () => {
    expect(directionFromKeys(new Set(["arrowright"]))).toEqual({ x: 1, y: 0 })
    expect(directionFromKeys(new Set(["a"]))).toEqual({ x: -1, y: 0 })
    expect(directionFromKeys(new Set(["w"]))).toEqual({ x: 0, y: -1 })
    expect(directionFromKeys(new Set(["arrowdown"]))).toEqual({ x: 0, y: 1 })
  })

  it("normalizes diagonals to length 1", () => {
    const d = directionFromKeys(new Set(["w", "d"]))
    expect(Math.hypot(d.x, d.y)).toBeCloseTo(1)
    expect(d.x).toBeGreaterThan(0)
    expect(d.y).toBeLessThan(0)
  })

  it("cancels opposing keys", () => {
    expect(directionFromKeys(new Set(["a", "d"]))).toEqual({ x: 0, y: 0 })
  })
})

describe("stepPosition", () => {
  const feet: Rect = { x: 50, y: 50, w: 10, h: 5 }

  it("moves by speed times dt", () => {
    const next = stepPosition(feet, { x: 1, y: 0 }, 60, 0.5, bounds, [])
    expect(next).toEqual({ x: 80, y: 50 })
  })

  it("clamps to bounds", () => {
    const next = stepPosition(feet, { x: 1, y: 0 }, 1000, 1, bounds, [])
    expect(next.x).toBe(90)
  })

  it("stops at an obstacle on the x axis but slides on y", () => {
    const wall: Rect = { x: 62, y: 0, w: 30, h: 100 }
    const next = stepPosition(feet, { x: 1, y: 1 }, 60, 0.5, bounds, [wall])
    expect(next.x).toBe(50)
    expect(next.y).toBeGreaterThan(50)
  })

  it("does not move into an obstacle on the y axis", () => {
    const shelf: Rect = { x: 0, y: 58, w: 100, h: 42 }
    const next = stepPosition(feet, { x: 0, y: 1 }, 60, 1, bounds, [shelf])
    expect(next.y).toBe(50)
  })
})

describe("isNear", () => {
  it("is true inside the radius and false outside", () => {
    expect(isNear({ x: 0, y: 0 }, { x: 3, y: 4 }, 5)).toBe(true)
    expect(isNear({ x: 0, y: 0 }, { x: 3, y: 4 }, 4.9)).toBe(false)
  })
})
