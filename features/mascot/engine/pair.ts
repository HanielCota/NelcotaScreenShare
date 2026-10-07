import type { MascotActivity } from "./personality";

/**
 * O encontro dos dois mascotes na home: andam até o meio, se preparam, batem
 * as mãos, comemoram e voltam. Durações em ms (a caminhada também vai para o CSS).
 */
export type PairPhase = "rest" | "approach" | "ready" | "hit" | "cheer" | "return";

export const PAIR_STEP_MS = { walk: 3200, turn: 250, ready: 450, hit: 450, cheer: 800 } as const;

/** O que cada mascote do par está fazendo em cada fase (abrindo a sala: esperando). */
export function pairActivity(phase: PairPhase, pending: boolean): MascotActivity {
  if (pending) return "waiting";
  if (phase === "ready" || phase === "hit" || phase === "cheer") return "greeting";
  if (phase === "approach" || phase === "return") return "walking";
  return "idle";
}
