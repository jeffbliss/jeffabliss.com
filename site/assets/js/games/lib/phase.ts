export type Phase = "explore" | "dialogue" | "ending"

export function nextPhase(phase: Phase, event: "interact" | "dismiss"): Phase {
  if (phase === "explore" && event === "interact") return "dialogue"
  if (phase === "dialogue" && event === "dismiss") return "ending"
  return phase
}
