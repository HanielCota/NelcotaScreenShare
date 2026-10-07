import type { Expression } from "@/features/mascot/domain/face";
import type { createPersonality } from "@/features/mascot/domain/personality";
import { idleSleep } from "@/features/mascot/domain/sleep";

interface SleepClockContext {
  personality: ReturnType<typeof createPersonality>;
  /** Can it nap now (enabled, still, tab visible, on screen)? */
  canSleep: () => boolean;
  setSleep: (expression: Expression) => void;
  /** Removes sleep; tells whether it was active. */
  dropSleep: () => boolean;
  clearSleep: () => void;
  update: () => void;
}

/**
 * Inactivity sleep: sleepy at 30 s, asleep at 45 s (engine/sleep.ts).
 * Any activity wakes it up, with a stretch.
 */
export function createSleepClock(ctx: SleepClockContext) {
  let lastActivity = performance.now();
  let timer = 0;
  let stage: "sleepy" | "asleep" | null = null;

  function check() {
    window.clearTimeout(timer);
    timer = 0;
    if (!ctx.canSleep()) return;
    const { expression, nextIn } = idleSleep(lastActivity, performance.now());
    const previous = stage;
    stage = expression;
    applyStage(expression, previous);
    if (Number.isFinite(nextIn)) timer = window.setTimeout(check, nextIn);
  }

  /** Shows the sleep stage (yawning when it gets sleepy) or clears it when awake. */
  function applyStage(expression: typeof stage, previous: typeof stage) {
    if (!expression) {
      ctx.clearSleep();
      return;
    }
    ctx.setSleep(expression);
    if (expression === "sleepy" && previous !== "sleepy") ctx.personality.yawn();
    if (expression === "asleep") ctx.personality.cancel();
  }

  return {
    check,
    /** Wakes up without keeping a sleepy expression during the next interaction. */
    activity() {
      lastActivity = performance.now();
      if (ctx.dropSleep()) {
        stage = null;
        ctx.personality.cancel();
        ctx.update();
        ctx.personality.stretch();
      }
      // The timer reads the latest activity when it fires; it is not recreated on every pixel.
      if (!timer) check();
    },
    /** Leaves sleep without reacting (the context changed: walking, presenting…). */
    forget() {
      ctx.dropSleep();
      stage = null;
    },
    /** Starts counting from zero again (sleep was turned on or off). */
    restart() {
      lastActivity = performance.now();
      check();
    },
    stop() {
      window.clearTimeout(timer);
      timer = 0;
    },
  };
}
