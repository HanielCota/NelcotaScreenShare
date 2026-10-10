import type { createPairMotion } from "@/features/mascot/domain/pair-motion";
import type { PairPhase } from "@/features/mascot/domain/pair";

type PairMotion = ReturnType<typeof createPairMotion>;

interface PageActivityListeners {
  noteActivity: () => void;
  focusOrTouch: (event: Event) => void;
  suspend: () => void;
}

/** Writes the positions to the scene; `onPhase` only runs when the phase or the pause changes. */
export function createPhaseRenderer(
  scene: HTMLElement,
  motion: PairMotion,
  onPhase: (phase: PairPhase, suspended: boolean) => void,
) {
  let renderedPhase: PairPhase | undefined;
  let renderedSuspended = false;

  return function render() {
    const state = motion.state;
    scene.style.setProperty("--visitor-x", `${state.visitor.toFixed(3)}px`);
    scene.style.setProperty("--resident-x", `${state.resident.toFixed(3)}px`);
    scene.dataset.positioned = "true";
    if (renderedPhase !== state.phase || renderedSuspended !== state.suspended) {
      renderedPhase = state.phase;
      renderedSuspended = state.suspended;
      onPhase(state.phase, state.suspended);
    }
  };
}

/** The next tick: an animation frame when it is due now, a timer otherwise. */
export function createTickHandle() {
  let frame = 0;
  let timer = 0;

  return {
    request(tick: () => void, delay: number) {
      if (delay === 0) {
        frame = requestAnimationFrame(tick);
        return;
      }
      timer = window.setTimeout(tick, delay);
    },
    /** The tick ran: nothing is scheduled anymore. */
    clear() {
      frame = 0;
      timer = 0;
    },
    cancel() {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      frame = 0;
      timer = 0;
    },
  };
}

/** Page events that count as activity, interrupt the visitor or change the pause. */
export function listenToPageActivity(
  scene: HTMLElement,
  preference: MediaQueryList,
  { noteActivity, focusOrTouch, suspend }: PageActivityListeners,
) {
  document.addEventListener("focusin", focusOrTouch);
  window.addEventListener("pointermove", noteActivity, { passive: true });
  window.addEventListener("pointerdown", noteActivity, { passive: true });
  document.addEventListener("keydown", noteActivity);
  document.addEventListener("input", noteActivity);
  scene.addEventListener("pointerdown", focusOrTouch);
  document.addEventListener("visibilitychange", suspend);
  preference.addEventListener("change", suspend);

  return function stop() {
    document.removeEventListener("focusin", focusOrTouch);
    window.removeEventListener("pointermove", noteActivity);
    window.removeEventListener("pointerdown", noteActivity);
    document.removeEventListener("keydown", noteActivity);
    document.removeEventListener("input", noteActivity);
    scene.removeEventListener("pointerdown", focusOrTouch);
    document.removeEventListener("visibilitychange", suspend);
    preference.removeEventListener("change", suspend);
  };
}
