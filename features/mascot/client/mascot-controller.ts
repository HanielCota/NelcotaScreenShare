import { type Motion } from "@/features/mascot/domain/body-motions";
import { EXPRESSIONS, toFaceState, type Expression } from "@/features/mascot/domain/face";
import {
  createPersonality,
  voiceAmount,
  type MascotActivity,
} from "@/features/mascot/domain/personality";
import { createReasons, type Reason } from "@/features/mascot/domain/reasons";
import {
  blocksPlay,
  canBlink,
  canSneeze,
  faceResponse,
  gazeFocus,
  isSleeping,
  listeningFace,
  waitingGaze,
} from "@/features/mascot/domain/rules";
import { prefersReducedMotion } from "@/lib/animation/motion";
import { createFaceAnimator } from "./face-animator";
import type { FaceRenderer } from "./face-renderer";
import { focusedPasswordField, gazeFor, IDLE } from "./gaze";
import { createHandMotions } from "./hand-motions";
import { startAmbient } from "./ambient";
import { listenToSignals } from "./signals";
import { subscribePageInput } from "./page-input";
import { createSleepClock } from "./sleep-clock";
import { pageReactions } from "./page-reactions";
import { attachTouch } from "./touch";

/** O que o componente informa ao controlador (lido na hora, sem recriar nada). */
export interface MascotInputs {
  base: () => Expression;
  canSleep: () => boolean;
  activity: () => MascotActivity;
  /** Nível da voz (0–1) para o "ouvindo". */
  voice: () => number;
}

/**
 * O comportamento do mascote: junta o que acontece na tela (mouse, foco,
 * digitação, avisos do sistema) numa expressão e num olhar, e anima o rosto.
 *
 * - Expressão: motivos com prazo e prioridade (engine/reasons.ts).
 * - Regras por expressão: engine/rules.ts.
 * - Olhar: geometria da tela (dom/gaze.ts). Desenho: dom/face-animator.ts.
 */
export function createMascotController(
  root: HTMLElement,
  face: HTMLElement,
  renderer: FaceRenderer,
  inputs: MascotInputs,
) {
  const hands = createHandMotions(root);
  const reasons = createReasons();
  const reducedMotion = prefersReducedMotion;

  let pointer: { x: number; y: number } | null = null;
  let current: Expression = inputs.base();
  let reasonTimer = 0;
  let bodyAnimation: Animation | undefined;
  /** Atualização agendada pro próximo quadro (vários eventos no mesmo quadro viram uma). */
  let queuedUpdate = 0;
  /** Depois de desmontado, atualizações atrasadas (timers) não fazem mais nada. */
  let disposed = false;
  let onScreen = true;

  const animator = createFaceAnimator(renderer, toFaceState(EXPRESSIONS[current]), {
    canRun: () => !disposed && !document.hidden && onScreen,
    beforeFrame(time) {
      const waiting = current === "waiting";
      const listening = current === "listening";
      const trackingPartner = gazeFocus(current) === "partner";
      let nextFace;
      if (listening) {
        const voice = voiceAmount(inputs.voice());
        nextFace = listeningFace(faceTarget(), voice);
        root.style.setProperty("--voice", voice.toFixed(3));
      } else root.style.setProperty("--voice", "0");
      return {
        ...(waiting ? { gaze: waitingGaze(time) } : trackingPartner ? { gaze: gazeTarget() } : {}),
        ...(nextFace ? { face: nextFace } : {}),
        keepAlive: waiting || listening || trackingPartner,
      };
    },
    responseFor: (key) => faceResponse(current, key),
  });

  const personality = createPersonality({
    root,
    hands,
    react: (expression) => {
      if (expression) setReason("interaction", expression);
      else clearReason("interaction");
    },
    move,
    stopMotion: () => {
      bodyAnimation?.cancel();
      bodyAnimation = undefined;
    },
    available: () =>
      !disposed &&
      onScreen &&
      !document.hidden &&
      !eyeOverride() &&
      (inputs.activity() === "idle" || inputs.activity() === "walking") &&
      !blocksPlay(current),
  });

  const signals = listenToSignals({
    personality,
    hands,
    onActivity,
    dropReason: (reason) => void reasons.delete(reason),
    setReason,
    clearReason,
    move,
    stopBody: () => bodyAnimation?.cancel(),
    update,
  });

  // ---------- Expressão e olhar ----------

  function setReason(reason: Reason, expression: Expression, durationMs?: number) {
    reasons.set(reason, expression, durationMs);
    update();
  }

  function clearReason(reason: Reason) {
    if (reasons.delete(reason)) update();
  }

  /** Senha escondida: olhos fechados. Mostrando: espia com um olho só (mas não dormindo). */
  function eyeOverride(): readonly [number, number] | undefined {
    const field = focusedPasswordField();
    if (!field || current === "asleep") return undefined;
    return field.type === "password" ? [1, 1] : [1, 0];
  }

  function faceTarget() {
    return toFaceState(EXPRESSIONS[current], eyeOverride());
  }

  /** O outro mascote do par (andando ou se cumprimentando, um olha para o outro). */
  function partner(): Element | undefined {
    return [
      ...(root.closest("[data-mascot-pair]")?.querySelectorAll("[data-slot=mascot]") ?? []),
    ].find((other) => other !== root);
  }

  function gazeTarget() {
    const focus = gazeFocus(current);
    if (focus === "idle") return IDLE;
    const target =
      signals.attentionTarget() ??
      (focus === "partner"
        ? partner()
        : focus === "stage"
          ? (document.querySelector("[data-mascot-stage]") ?? undefined)
          : undefined);
    return gazeFor(face, target, pointer);
  }

  /** Agenda uma reavaliação pro próximo motivo que vai vencer. */
  function scheduleReasonExpiry() {
    window.clearTimeout(reasonTimer);
    const next = reasons.nextExpiry();
    if (Number.isFinite(next)) {
      reasonTimer = window.setTimeout(update, Math.max(0, next - performance.now()) + 16);
    }
  }

  /** Mãos e gestos que a expressão atual não permite param aqui. */
  function settleGestures(previous: Expression, eyes: readonly [number, number] | undefined) {
    if (previous === "presenting" && current !== "presenting") hands.cancel();
    // A pose fechada tem prioridade sobre um aceno iniciado antes do foco na senha.
    if (eyes || isSleeping(current)) hands.cancel();
    if (personality.active && (eyes || blocksPlay(current))) personality.cancel();
    // Une pose sustentada à atenção no palco; a rotina de mão não cobre olhos de senha.
    if (current === "presenting" && !eyes && !reducedMotion()) hands.hold();
    if (eyes || current === "asleep" || reducedMotion()) animator.cancelBlink();
  }

  /** Movimento reduzido: sem molas nem animações, direto à pose final. */
  function snapToTargets() {
    root.getAnimations().forEach((animation) => animation.cancel());
    hands.cancel();
    renderer.lids.forEach((lid) => lid.getAnimations().forEach((animation) => animation.cancel()));
    animator.snap();
  }

  /** Recalcula expressão e olhar e anima até eles (ou pula direto, com movimento reduzido). */
  function update() {
    if (disposed) return;
    const previous = current;
    current = reasons.current(inputs.base());
    root.dataset.expression = current;
    root.dataset.motion = document.hidden || !onScreen ? "paused" : "active";
    scheduleReasonExpiry();
    animator.setTargets(gazeTarget(), faceTarget());
    settleGestures(previous, eyeOverride());
    if (reducedMotion()) snapToTargets();
    else if (!document.hidden && onScreen) animator.start();
  }

  /** Pra eventos frequentes (mouse, seleção, rolagem): recalcula uma vez por quadro. */
  function requestUpdate() {
    // Fora da tela: não mede nem anima a cada movimento do mouse (o olhar se acerta ao voltar).
    if (disposed || queuedUpdate || !onScreen) return;
    queuedUpdate = requestAnimationFrame(() => {
      queuedUpdate = 0;
      update();
    });
  }

  /** Movimento do corpo inteiro; desligado com movimento reduzido. */
  function move({ keyframes, options }: Motion) {
    bodyAnimation?.cancel();
    bodyAnimation = undefined;
    if (reducedMotion() || document.hidden || !onScreen) return undefined;
    bodyAnimation = root.animate(keyframes, options);
    return bodyAnimation;
  }

  // ---------- Sono ----------

  const sleep = createSleepClock({
    personality,
    canSleep: () =>
      inputs.canSleep() && inputs.activity() === "idle" && !document.hidden && onScreen,
    setSleep: (expression) => setReason("sleep", expression),
    dropSleep: () => reasons.delete("sleep"),
    clearSleep: () => clearReason("sleep"),
    update,
  });

  function onActivity() {
    sleep.activity();
  }

  // ---------- Eventos ----------

  const touch = attachTouch({
    root,
    hands,
    personality,
    move,
    onActivity,
    current: () => current,
    activity: inputs.activity,
    visible: () => onScreen && !document.hidden,
    sleeping: () => isSleeping(current),
  });

  const stopPageInput = subscribePageInput(
    pageReactions({
      root,
      personality,
      activity: inputs.activity,
      setReason,
      clearReason,
      dropReason: (reason) => void reasons.delete(reason),
      setPointer: (next) => {
        pointer = next;
      },
      update,
      requestUpdate,
      onActivity,
      pauseMotion,
    }),
  );

  // Pausa animações fora da tela ou com a aba escondida.
  function pauseMotion() {
    root.dataset.motion = "paused";
    animator.pause();
    cancelAnimationFrame(queuedUpdate);
    queuedUpdate = 0;
    touch.cancelPress();
    bodyAnimation?.cancel();
    personality.cancel();
    hands.cancel();
    sleep.stop();
  }

  sleep.check();
  update();

  /** Mudou a atividade (andando, apresentando…): a expressão de contexto acompanha. */
  function syncContext() {
    const nextActivity = inputs.activity();
    // Andar e ficar parado se alternam no par da home a cada poucos segundos:
    // um carinho ou "toca aqui" em andamento continua; o resto interrompe.
    if (nextActivity !== "idle" && nextActivity !== "walking") personality.cancel();
    if (nextActivity === "idle") clearReason("context");
    else {
      sleep.forget();
      reasons.delete("curiosity");
      setReason("context", nextActivity);
    }
    update();
    sleep.check();
  }
  syncContext();
  touch.greetWhenReady();

  const stopAmbient = startAmbient({
    canBlink: () =>
      !reducedMotion() && !document.hidden && onScreen && canBlink(current) && !eyeOverride(),
    blink: () => {
      animator.blink();
      update();
    },
    canSneeze: () =>
      !disposed &&
      !reducedMotion() &&
      !personality.active &&
      canSneeze(current) &&
      !(document.activeElement instanceof HTMLInputElement) &&
      !(document.activeElement instanceof HTMLTextAreaElement),
    sneeze: () => personality.sneeze(),
  });

  const visibility = new IntersectionObserver(([entry]) => {
    onScreen = entry?.isIntersecting ?? true;
    if (onScreen) {
      onActivity();
      update();
    } else pauseMotion();
  });
  visibility.observe(root);

  return {
    /** A expressão de repouso mudou. */
    update,
    syncContext,
    /** Ligou ou desligou o sono: desligado no meio do cochilo, acorda na hora. */
    resetSleep() {
      if (!inputs.canSleep() && reasons.delete("sleep")) update();
      sleep.restart();
    },
    dispose() {
      disposed = true;
      animator.dispose();
      cancelAnimationFrame(queuedUpdate);
      root.getAnimations().forEach((animation) => animation.cancel());
      hands.cancel();
      personality.cancel();
      renderer.lids.forEach((lid) =>
        lid.getAnimations().forEach((animation) => animation.cancel()),
      );
      sleep.stop();
      stopAmbient();
      window.clearTimeout(reasonTimer);
      visibility.disconnect();
      signals.stop();
      stopPageInput();
      touch.detach();
    },
  };
}
