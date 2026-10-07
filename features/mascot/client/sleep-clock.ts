import type { Expression } from "@/features/mascot/domain/face";
import type { createPersonality } from "@/features/mascot/domain/personality";
import { idleSleep } from "@/features/mascot/domain/sleep";

interface SleepClockContext {
  personality: ReturnType<typeof createPersonality>;
  /** Pode cochilar agora (habilitado, parado, aba visível, na tela)? */
  canSleep: () => boolean;
  setSleep: (expression: Expression) => void;
  /** Remove o sono; diz se ele estava ativo. */
  dropSleep: () => boolean;
  clearSleep: () => void;
  update: () => void;
}

/**
 * Sono por inatividade: sonolento aos 30 s, dormindo aos 45 s (engine/sleep.ts).
 * Qualquer atividade acorda, com um espreguiçar.
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
    if (expression) {
      ctx.setSleep(expression);
      if (expression === "sleepy" && previous !== "sleepy") ctx.personality.yawn();
      if (expression === "asleep") ctx.personality.cancel();
    } else ctx.clearSleep();
    if (Number.isFinite(nextIn)) timer = window.setTimeout(check, nextIn);
  }

  return {
    check,
    /** Acorda sem manter uma expressão sonolenta durante a próxima interação. */
    activity() {
      lastActivity = performance.now();
      if (ctx.dropSleep()) {
        stage = null;
        ctx.personality.cancel();
        ctx.update();
        ctx.personality.stretch();
      }
      // O timer consulta a atividade mais recente ao disparar; não o recria a cada pixel.
      if (!timer) check();
    },
    /** Sai do sono sem reagir (mudou o contexto: andando, apresentando…). */
    forget() {
      ctx.dropSleep();
      stage = null;
    },
    /** Recomeça a contar do zero (ligou ou desligou o sono). */
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
