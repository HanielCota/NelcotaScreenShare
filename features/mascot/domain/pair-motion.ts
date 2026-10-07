import { nextPairRest, PAIR_STEP_MS, type PairPhase } from "./pair";

export interface PairGeometry {
  width: number;
  size: number;
}

/** Real positions and phases share one clock; only arrival allows the greeting. */
export function createPairMotion(random: () => number = Math.random) {
  let geometry: PairGeometry | undefined;
  let phase: PairPhase = "rest";
  let visitor = 0;
  let resident = 0;
  let remaining = nextPairRest(random());
  let suspended = false;

  function landmarks() {
    const { width, size } = geometry ?? { width: 0, size: 0 };
    const meeting = width / 2 - size * 0.39;
    const home = Math.max(size / 2, Math.min(width * 0.16, meeting));
    return { width, size, meeting, home };
  }

  function targets() {
    const { width, size, meeting, home } = landmarks();
    if (phase === "return" || phase === "rest") return [home, width - home] as const;
    const gap = phase === "approach" || phase === "ready" ? size * 0.04 : 0;
    return [meeting - gap, width - meeting + gap] as const;
  }

  function arrived() {
    const [left, right] = targets();
    return Math.abs(visitor - left) < 0.001 && Math.abs(resident - right) < 0.001;
  }

  function change(next: PairPhase, wait = 0) {
    phase = next;
    remaining = wait;
  }

  function move(elapsed: number) {
    const { size, meeting, home } = landmarks();
    const speed =
      phase === "hit" ? (size * 0.04) / 180 : Math.abs(meeting - home) / PAIR_STEP_MS.walk;
    const distance = Math.max(0.02, speed) * elapsed;
    const [left, right] = targets();
    const toward = (value: number, target: number) =>
      value + Math.sign(target - value) * Math.min(Math.abs(target - value), distance);
    visitor = toward(visitor, left);
    resident = toward(resident, right);
  }

  function progressPhase(canApproach: boolean) {
    switch (phase) {
      case "rest":
        if (!remaining && canApproach) change("approach");
        break;
      case "approach":
        if (arrived()) change("ready", PAIR_STEP_MS.ready);
        break;
      case "ready":
        if (!remaining) change("hit", PAIR_STEP_MS.hit);
        break;
      case "hit":
        if (!remaining && arrived()) change("cheer", PAIR_STEP_MS.cheer);
        break;
      case "cheer":
        if (!remaining) change("return");
        break;
      case "return":
        if (arrived()) change("rest", nextPairRest(random()));
        break;
    }
  }

  return {
    get state() {
      return { phase, visitor, resident, suspended };
    },
    /** Only uses frames while moving; rest and poses use a timer. */
    get nextIn() {
      if (phase === "approach" || phase === "return" || (phase === "hit" && !arrived())) return 0;
      return Math.max(remaining, 100);
    },
    resize(next: PairGeometry) {
      if (geometry?.width === next.width && geometry.size === next.size) return;
      const initial = !geometry;
      geometry = next;
      if (initial) {
        [visitor, resident] = targets();
        return;
      }
      if (phase === "ready") {
        change("approach");
        return;
      }
      if (phase !== "approach" && phase !== "return") change("return");
    },
    suspend(value: boolean) {
      suspended = value;
    },
    retreat() {
      if (phase !== "rest" && phase !== "return") change("return");
    },
    advance(elapsed: number, canApproach: boolean) {
      if (suspended || !geometry) return;
      const dt = Math.max(0, elapsed);
      if (phase === "approach" || phase === "return" || phase === "hit") move(dt);
      remaining = Math.max(0, remaining - dt);
      progressPhase(canApproach);
    },
  };
}
