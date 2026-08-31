import gsap from "gsap"
import { directionFromKeys, isNear, stepPosition, type Rect, type Vec } from "../lib/logic"
import { nextPhase, type Phase } from "../lib/phase"

const SPEED = 70
const INTERACT_RADIUS = 26
const SPRITE_W = 16
const FEET = { dx: 1, dy: 38, w: 14, h: 6 }
const DIALOGUE_TEXT = "Good morning. Today will be a good day"
const END_TEXT = "ENJOY YOUR DAY. YOU ARE LOVED."

const stage = document.querySelector<HTMLElement>(".game-stage")
const ui = document.querySelector<HTMLElement>(".game-ui")
const svg = stage?.querySelector<SVGSVGElement>("svg")
const hero = svg?.querySelector<SVGGElement>("#hero")
const floorEl = svg?.querySelector<SVGRectElement>("#floor")
const doorEl = svg?.querySelector<SVGGElement>("#door-target")

if (stage && ui && svg && hero && floorEl && doorEl) {
  start(stage, ui, svg, hero, floorEl, doorEl)
}

function rectFrom(el: SVGRectElement): Rect {
  return {
    x: Number(el.getAttribute("x")),
    y: Number(el.getAttribute("y")),
    w: Number(el.getAttribute("width")),
    h: Number(el.getAttribute("height")),
  }
}

function feetCenter(feet: Rect): Vec {
  return { x: feet.x + feet.w / 2, y: feet.y + feet.h / 2 }
}

function makeUi(ui: HTMLElement) {
  const hint = document.createElement("div")
  hint.className = "game-hint"
  hint.textContent = "Press E to open the door"
  hint.hidden = true

  const dialogue = document.createElement("div")
  dialogue.className = "game-dialogue"
  dialogue.hidden = true
  const line = document.createElement("p")
  line.textContent = DIALOGUE_TEXT
  const cont = document.createElement("span")
  cont.className = "game-dialogue-hint"
  cont.textContent = "E to continue"
  dialogue.append(line, cont)

  const overlay = document.createElement("div")
  overlay.className = "game-fade"

  const endCard = document.createElement("div")
  endCard.className = "game-end-card"
  endCard.textContent = END_TEXT

  ui.append(hint, dialogue, overlay, endCard)
  return { hint, dialogue, overlay, endCard }
}

function start(
  stage: HTMLElement,
  ui: HTMLElement,
  svg: SVGSVGElement,
  hero: SVGGElement,
  floorEl: SVGRectElement,
  doorEl: SVGGElement,
) {
  const bounds = rectFrom(floorEl)
  const obstacles = Array.from(svg.querySelectorAll<SVGRectElement>(".obstacle")).map(rectFrom)
  const door: Vec = { x: Number(doorEl.dataset.x), y: Number(doorEl.dataset.y) }

  const startMatch = /translate\((-?\d+)[ ,](-?\d+)\)/.exec(hero.getAttribute("transform") ?? "")
  let feet: Rect = {
    x: (startMatch ? Number(startMatch[1]) : 64) + FEET.dx,
    y: (startMatch ? Number(startMatch[2]) : 96) + FEET.dy,
    w: FEET.w,
    h: FEET.h,
  }
  let facing = 1
  let phase: Phase = "explore"

  const { hint, dialogue, overlay, endCard } = makeUi(ui)

  function playEnding() {
    hint.hidden = true
    const tl = gsap.timeline()
    tl.to(overlay, { autoAlpha: 1, duration: 1.4, ease: "power2.inOut" })
    tl.to(endCard, { autoAlpha: 1, duration: 1.0, ease: "power1.out" }, "+=0.4")
  }

  function onEvent(event: "interact" | "dismiss") {
    const before = phase
    phase = nextPhase(phase, event)
    if (phase === before) return
    if (phase === "dialogue") dialogue.hidden = false
    if (phase === "ending") {
      dialogue.hidden = true
      playEnding()
    }
  }

  const keys = new Set<string>()
  const GAME_KEYS = ["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", " ", "e"]
  window.addEventListener("keydown", (ev) => {
    const key = ev.key.toLowerCase()
    if (!GAME_KEYS.includes(key)) return
    ev.preventDefault()
    if (ev.repeat) return
    keys.add(key)
    if (key === "e" || key === " ") {
      if (phase === "explore" && isNear(feetCenter(feet), door, INTERACT_RADIUS)) onEvent("interact")
      else if (phase === "dialogue") onEvent("dismiss")
    }
  })
  window.addEventListener("keyup", (ev) => {
    keys.delete(ev.key.toLowerCase())
  })

  let last = performance.now()
  function frame(now: number) {
    const dt = Math.min((now - last) / 1000, 0.05)
    last = now
    if (phase === "explore") {
      const dir = directionFromKeys(keys)
      if (dir.x !== 0) facing = dir.x > 0 ? 1 : -1
      feet = { ...feet, ...stepPosition(feet, dir, SPEED, dt, bounds, obstacles) }
      const flip = facing === -1 ? ` translate(${SPRITE_W} 0) scale(-1 1)` : ""
      hero.setAttribute("transform", `translate(${feet.x - FEET.dx} ${feet.y - FEET.dy})${flip}`)
      hint.hidden = !isNear(feetCenter(feet), door, INTERACT_RADIUS)
    }
    if (phase !== "ending") requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
}
