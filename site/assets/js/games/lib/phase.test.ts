import { describe, expect, it } from "vitest"
import { nextPhase } from "./phase"

describe("nextPhase", () => {
  it("interact during explore opens the dialogue", () => {
    expect(nextPhase("explore", "interact")).toBe("dialogue")
  })

  it("dismiss during dialogue starts the ending", () => {
    expect(nextPhase("dialogue", "dismiss")).toBe("ending")
  })

  it("ignores dismiss during explore", () => {
    expect(nextPhase("explore", "dismiss")).toBe("explore")
  })

  it("ignores interact during dialogue", () => {
    expect(nextPhase("dialogue", "interact")).toBe("dialogue")
  })

  it("the ending is terminal", () => {
    expect(nextPhase("ending", "interact")).toBe("ending")
    expect(nextPhase("ending", "dismiss")).toBe("ending")
  })
})
