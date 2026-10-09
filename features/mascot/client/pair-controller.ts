import { onMascotSignal } from "@/features/mascot/client/events";
import { createPairMotion } from "@/features/mascot/domain/pair-motion";
import type { PairPhase } from "@/features/mascot/domain/pair";
import { PAIR_BUSY_SELECTOR } from "@/features/mascot/domain/rules";
import { SLEEPY_AFTER_MS } from "@/features/mascot/domain/sleep";
import { MOTION_QUERIES } from "@/lib/animation/motion";
import { createPhaseRenderer, createTickHandle, listenToPageActivity } from "./pair-scheduling";

/** Focusing or touching these sends the visitor back: the person is busy with the page. */
const INTERRUPTING_TARGETS = "input, textarea, [contenteditable=true], [data-mascot-action]";

/** Keeps the position when pausing; React only receives phase changes. */
export function createPairController(
  scene: HTMLElement,
  onPhase: (phase: PairPhase, suspended: boolean) => void,
) {
  const motion = createPairMotion();
  const preference = window.matchMedia(MOTION_QUERIES.reduced);
  const render = createPhaseRenderer(scene, motion, onPhase);
  const ticks = createTickHandle();
  let pending = false;
  let visible = true;
  let idle = false;
  let disposed = false;
  let idleTimer = 0;
  let lastActivity = performance.now();
  let lastTick = lastActivity;

  function paused() {
    return pending || !visible || document.hidden || preference.matches;
  }

  function available() {
    return (
      !idle &&
      !document.activeElement?.matches(INTERRUPTING_TARGETS) &&
      !scene.querySelector(PAIR_BUSY_SELECTOR)
    );
  }

  function schedule() {
    if (disposed || paused() || (idle && motion.state.phase === "rest")) return;
    ticks.request(tick, motion.nextIn);
  }

  function tick() {
    ticks.clear();
    if (disposed || paused()) return;
    const now = performance.now();
    motion.advance(now - lastTick, available());
    lastTick = now;
    render();
    schedule();
  }

  function restartTick() {
    ticks.cancel();
    lastTick = performance.now();
    schedule();
  }

  function interrupt() {
    motion.retreat();
    render();
    restartTick();
  }

  function checkIdle() {
    const remaining = SLEEPY_AFTER_MS - (performance.now() - lastActivity);
    if (remaining > 0) {
      idleTimer = window.setTimeout(checkIdle, remaining);
      return;
    }
    idleTimer = 0;
    idle = true;
    interrupt();
  }

  function noteActivity() {
    lastActivity = performance.now();
    const waking = idle;
    idle = false;
    if (!idleTimer && !paused()) idleTimer = window.setTimeout(checkIdle, SLEEPY_AFTER_MS);
    if (waking) restartTick();
  }

  function suspend() {
    const suspended = paused();
    // Records the last active interval before also freezing the pose deadline.
    if (suspended && !motion.state.suspended)
      motion.advance(performance.now() - lastTick, available());
    motion.suspend(suspended);
    scene.dataset.suspended = String(suspended);
    window.clearTimeout(idleTimer);
    idleTimer = 0;
    if (!suspended) noteActivity();
    render();
    restartTick();
  }

  function measure() {
    if (!motion.state.suspended) motion.advance(performance.now() - lastTick, available());
    motion.resize({
      width: scene.clientWidth,
      size: scene.querySelector<HTMLElement>('[data-slot="mascot"]')?.offsetWidth ?? 112,
    });
    render();
    restartTick();
  }

  function focusOrTouch(event: Event) {
    noteActivity();
    if (event.target instanceof Element && event.target.closest(INTERRUPTING_TARGETS)) interrupt();
  }

  const resize = new ResizeObserver(measure);
  const intersection = new IntersectionObserver(([entry]) => {
    visible = entry?.isIntersecting ?? false;
    suspend();
  });
  const stopSignals = onMascotSignal(() => {
    noteActivity();
    interrupt();
  });
  const stopPageActivity = listenToPageActivity(scene, preference, {
    noteActivity,
    focusOrTouch,
    suspend,
  });
  measure();
  suspend();
  resize.observe(scene);
  intersection.observe(scene);

  return {
    setPending(value: boolean) {
      if (pending === value) return;
      pending = value;
      suspend();
    },
    dispose() {
      disposed = true;
      ticks.cancel();
      window.clearTimeout(idleTimer);
      resize.disconnect();
      intersection.disconnect();
      stopSignals();
      stopPageActivity();
    },
  };
}
