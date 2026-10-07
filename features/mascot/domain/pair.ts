import type { MascotActivity } from "./personality";

/**
 * The meeting of the two mascots on the home page: they walk to the middle, get ready, high-five,
 * celebrate and walk back. Durations in ms (the walk also goes to the CSS).
 */
export type PairPhase = "rest" | "approach" | "ready" | "hit" | "cheer" | "return";

export const PAIR_STEP_MS = { walk: 3200, ready: 450, hit: 450, cheer: 800 } as const;

/** Real rest between meetings; the variation avoids mechanical repetition. */
export function nextPairRest(random = Math.random()): number {
  return 6000 + random * 4000;
}

/** What each mascot of the pair is doing in each phase (opening the room: waiting). */
export function pairActivity(phase: PairPhase, pending: boolean): MascotActivity {
  if (pending) return "waiting";
  if (phase === "ready" || phase === "hit" || phase === "cheer") return "greeting";
  if (phase === "approach" || phase === "return") return "walking";
  return "idle";
}
