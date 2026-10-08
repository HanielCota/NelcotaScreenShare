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
import { gazeFor, IDLE, pairPartner, passwordEyes } from "./gaze";
import { createHandMotions } from "./hand-motions";
import { startAmbient } from "./ambient";
import { listenToSignals } from "./signals";
import { subscribePageInput } from "./page-input";
import { createSleepClock } from "./sleep-clock";
import { pageReactions } from "./page-reactions";
import { attachTouch } from "./touch";

/** What the component tells the controller (read on demand, without recreating anything). */
export interface MascotInputs {
  base: () => Expression;
  canSleep: () => boolean;
  activity: () => MascotActivity;
  /** Voice level (0–1) for "listening". */
  voice: () => number;
}

/**
 * The mascot's behavior: combines what happens on screen (mouse, focus,
 * typing, system signals) into an expression and a gaze, and animates the face.
 *
 * - Expression: reasons with deadline and priority (domain/reasons.ts).
 * - Per-expression rules: domain/rules.ts.
 * - Gaze: screen geometry (client/gaze.ts). Drawing: client/face-animator.ts.
 */
export function createMascotController(
  root: HTMLElement,
  face: HTMLElement,
  renderer: FaceRenderer,
  inputs: MascotInputs,
) {
  const hands = createHandMotions(root);
  const reasons = createReasons();

  let pointer: { x: number; y: number } | null = null;
  let current: Expression = inputs.base();
  let reasonTimer = 0;
  let bodyAnimation: Animation | undefined;
  /** Update scheduled for the next frame (several events in the same frame become one). */
  let queuedUpdate = 0;
  /** After unmount, late updates (timers) do nothing. */
  let disposed = false;
  let onScreen = true;

  const animator = createFaceAnimator(renderer, toFaceState(EXPRESSIONS[current]), {
    canRun: () => !disposed && !document.hidden && onScreen,
    beforeFrame(time) {
      const waiting = current === "waiting";
      const listening = current === "listening";
      const trackingPartner = gazeFocus(current) === "partner";
      const voice = listening ? voiceAmount(inputs.voice()) : 0;
      const nextFace = listening ? listeningFace(faceTarget(), voice) : undefined;
      root.style.setProperty("--voice", listening ? voice.toFixed(3) : "0");
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
    react: (expression) => toggleReason("interaction", expression),
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

  function setReason(reason: Reason, expression: Expression, durationMs?: number) {
    reasons.set(reason, expression, durationMs);
    update();
  }

  function clearReason(reason: Reason) {
    if (reasons.delete(reason)) update();
  }

  /** Sets the reason, or clears it when there is no expression. */
  function toggleReason(reason: Reason, expression: Expression | undefined) {
    if (!expression) {
      clearReason(reason);
      return;
    }
    setReason(reason, expression);
  }

  const eyeOverride = () => passwordEyes(current);

  function faceTarget() {
    return toFaceState(EXPRESSIONS[current], eyeOverride());
  }

  function gazeTarget() {
    const focus = gazeFocus(current);
    if (focus === "idle") return IDLE;
    const target =
      signals.attentionTarget() ??
      (focus === "partner"
        ? pairPartner(root)
        : focus === "stage"
          ? (document.querySelector("[data-mascot-stage]") ?? undefined)
          : undefined);
    return gazeFor(face, target, pointer);
  }

  /** Schedules a re-evaluation for the next reason that will expire. */
  function scheduleReasonExpiry() {
    window.clearTimeout(reasonTimer);
    const next = reasons.nextExpiry();
    if (Number.isFinite(next)) {
      reasonTimer = window.setTimeout(update, Math.max(0, next - performance.now()) + 16);
    }
  }

  /** Hands and gestures that the current expression does not allow stop here. */
  function settleGestures(previous: Expression, eyes: readonly [number, number] | undefined) {
    if (previous === "presenting" && current !== "presenting") hands.cancel();
    // The closed pose takes priority over a wave started before the password got focus.
    if (eyes || isSleeping(current)) hands.cancel();
    if (personality.active && (eyes || blocksPlay(current))) personality.cancel();
    // Pairs a held pose with attention on the stage; the hand routine does not cover password eyes.
    if (current === "presenting" && !eyes && !prefersReducedMotion()) hands.hold();
    if (eyes || current === "asleep" || prefersReducedMotion()) animator.cancelBlink();
  }

  /** Reduced motion: no springs or animations, straight to the final pose. */
  function snapToTargets() {
    root.getAnimations().forEach((animation) => animation.cancel());
    hands.cancel();
    renderer.lids.forEach((lid) => lid.getAnimations().forEach((animation) => animation.cancel()));
    animator.snap();
  }

  /** Recomputes expression and gaze and animates towards them (or jumps straight there, with reduced motion). */
  function update() {
    if (disposed) return;
    const previous = current;
    current = reasons.current(inputs.base());
    root.dataset.expression = current;
    root.dataset.motion = document.hidden || !onScreen ? "paused" : "active";
    scheduleReasonExpiry();
    animator.setTargets(gazeTarget(), faceTarget());
    settleGestures(previous, eyeOverride());
    if (prefersReducedMotion()) {
      snapToTargets();
      return;
    }
    if (!document.hidden && onScreen) animator.start();
  }

  /** For frequent events (mouse, selection, scroll): recomputes once per frame. */
  function requestUpdate() {
    // Off screen: does not measure or animate on every mouse move (the gaze catches up on return).
    if (disposed || queuedUpdate || !onScreen) return;
    queuedUpdate = requestAnimationFrame(() => {
      queuedUpdate = 0;
      update();
    });
  }

  /** Whole-body motion; turned off with reduced motion. */
  function move({ keyframes, options }: Motion) {
    bodyAnimation?.cancel();
    bodyAnimation = undefined;
    if (prefersReducedMotion() || document.hidden || !onScreen) return undefined;
    bodyAnimation = root.animate(keyframes, options);
    return bodyAnimation;
  }

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

  // Pauses animations off screen or with the tab hidden.
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

  /** The activity changed (walking, presenting…): the context expression follows. */
  function syncContext() {
    const nextActivity = inputs.activity();
    // Walking and standing still alternate in the home page pair every few seconds:
    // a pat or "high five" in progress continues; anything else is interrupted.
    if (nextActivity !== "idle" && nextActivity !== "walking") personality.cancel();
    if (nextActivity !== "idle") {
      sleep.forget();
      reasons.delete("curiosity");
    }
    toggleReason("context", nextActivity === "idle" ? undefined : nextActivity);
    update();
    sleep.check();
  }
  syncContext();
  touch.greetWhenReady();

  const stopAmbient = startAmbient({
    canBlink: () =>
      !prefersReducedMotion() && !document.hidden && onScreen && canBlink(current) && !eyeOverride(),
    blink: () => {
      animator.blink();
      update();
    },
    canSneeze: () =>
      !disposed &&
      !prefersReducedMotion() &&
      !personality.active &&
      canSneeze(current) &&
      !(document.activeElement instanceof HTMLInputElement) &&
      !(document.activeElement instanceof HTMLTextAreaElement),
    sneeze: () => personality.sneeze(),
  });

  const visibility = new IntersectionObserver(([entry]) => {
    onScreen = entry?.isIntersecting ?? true;
    if (!onScreen) {
      pauseMotion();
      return;
    }
    onActivity();
    update();
  });
  visibility.observe(root);

  return {
    /** The resting expression changed. */
    update,
    syncContext,
    /** Sleep was turned on or off: turned off mid-nap, it wakes up immediately. */
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
