import { JUMP, NOD, SHAKE, type Motion } from "@/features/mascot/domain/body-motions";
import type { Expression } from "@/features/mascot/domain/face";
import type { createPersonality } from "@/features/mascot/domain/personality";
import type { Reason } from "@/features/mascot/domain/reasons";
import { ATTENTION_MS, reactionTo } from "@/features/mascot/domain/rules";
import { onMascotSignal, type MascotSignal } from "@/features/mascot/client/events";
import type { createHandMotions } from "./hand-motions";

interface SignalContext {
  personality: ReturnType<typeof createPersonality>;
  hands: ReturnType<typeof createHandMotions>;
  onActivity: () => void;
  dropReason: (reason: Reason) => void;
  setReason: (reason: Reason, expression: Expression, durationMs?: number) => void;
  clearReason: (reason: Reason) => void;
  move: (motion: Motion) => Animation | undefined;
  stopBody: () => void;
  update: () => void;
}

const MOTIONS = { jump: JUMP, shake: SHAKE, nod: NOD } as const;

/**
 * Avisos das telas (events.ts): comemora, fica bravo, desconfia, acena. Um
 * aviso com `target` faz o mascote olhar para o elemento por um instante.
 */
export function listenToSignals(ctx: SignalContext) {
  let attention: { element: Element; until: number } | null = null;
  let attentionTimer = 0;

  function lookAtFor(element: Element) {
    attention = { element, until: performance.now() + ATTENTION_MS };
    window.clearTimeout(attentionTimer);
    attentionTimer = window.setTimeout(() => {
      attention = null;
      ctx.update();
    }, ATTENTION_MS + 16);
  }

  function onSignal(signal: MascotSignal) {
    ctx.onActivity();
    ctx.personality.cancel();
    const reaction = reactionTo(signal);
    for (const reason of reaction.clear) ctx.dropReason(reason);
    if (reaction.stopGestures) {
      ctx.hands.cancel();
      ctx.stopBody();
    }
    if (reaction.lookAtTarget && "target" in signal && signal.target) lookAtFor(signal.target);
    if (reaction.set) {
      ctx.setReason(reaction.set.reason, reaction.set.expression, reaction.set.durationMs);
    }
    if (reaction.unset) ctx.clearReason(reaction.unset);
    if (reaction.motion) ctx.move(MOTIONS[reaction.motion]);
    if (reaction.wave) ctx.hands.wave(reaction.wave === "celebrate");
  }

  const stop = onMascotSignal(onSignal);
  return {
    /** Elemento que pediu atenção há pouco (o olhar vai para ele). */
    attentionTarget: () =>
      attention && performance.now() < attention.until ? attention.element : undefined,
    stop() {
      stop();
      window.clearTimeout(attentionTimer);
    },
  };
}
