import { onMascotSignal } from "@/features/mascot/client/events";
import { createPairMotion } from "@/features/mascot/domain/pair-motion";
import type { PairPhase } from "@/features/mascot/domain/pair";
import { PAIR_BUSY_SELECTOR } from "@/features/mascot/domain/rules";
import { SLEEPY_AFTER_MS } from "@/features/mascot/domain/sleep";
import { MOTION_QUERIES } from "@/lib/animation/motion";

/** Mantém a posição ao pausar; React recebe apenas as mudanças de fase. */
export function createPairController(
  scene: HTMLElement,
  initialPending: boolean,
  onPhase: (phase: PairPhase, suspended: boolean) => void,
) {
  const motion = createPairMotion();
  const preference = window.matchMedia(MOTION_QUERIES.reduced);
  let pending = initialPending;
  let visible = true;
  let idle = false;
  let disposed = false;
  let frame = 0;
  let timer = 0;
  let idleTimer = 0;
  let lastActivity = performance.now();
  let lastTick = lastActivity;
  let renderedPhase: PairPhase | undefined;
  let renderedSuspended = false;

  function paused() {
    return pending || !visible || document.hidden || preference.matches;
  }

  function available() {
    return (
      !idle &&
      !document.activeElement?.matches(
        "input, textarea, [contenteditable=true], [data-mascot-action]",
      ) &&
      !scene.querySelector(PAIR_BUSY_SELECTOR)
    );
  }

  function render() {
    const state = motion.state;
    scene.style.setProperty("--visitor-x", `${state.visitor.toFixed(3)}px`);
    scene.style.setProperty("--resident-x", `${state.resident.toFixed(3)}px`);
    scene.dataset.positioned = "true";
    if (renderedPhase !== state.phase || renderedSuspended !== state.suspended) {
      renderedPhase = state.phase;
      renderedSuspended = state.suspended;
      onPhase(state.phase, state.suspended);
    }
  }

  function cancelTick() {
    cancelAnimationFrame(frame);
    window.clearTimeout(timer);
    frame = 0;
    timer = 0;
  }

  function schedule() {
    if (disposed || paused() || (idle && motion.state.phase === "rest")) return;
    if (motion.nextIn === 0) frame = requestAnimationFrame(tick);
    else timer = window.setTimeout(tick, motion.nextIn);
  }

  function tick() {
    frame = 0;
    timer = 0;
    if (disposed || paused()) return;
    const now = performance.now();
    motion.advance(now - lastTick, available());
    lastTick = now;
    render();
    schedule();
  }

  function restartTick() {
    cancelTick();
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
    // Registra o último intervalo ativo antes de congelar também o prazo da pose.
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
    if (
      event.target instanceof Element &&
      event.target.closest("input, textarea, [contenteditable=true], [data-mascot-action]")
    )
      interrupt();
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
  document.addEventListener("focusin", focusOrTouch);
  window.addEventListener("pointermove", noteActivity, { passive: true });
  window.addEventListener("pointerdown", noteActivity, { passive: true });
  document.addEventListener("keydown", noteActivity);
  document.addEventListener("input", noteActivity);
  scene.addEventListener("pointerdown", focusOrTouch);
  document.addEventListener("visibilitychange", suspend);
  preference.addEventListener("change", suspend);
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
      cancelTick();
      window.clearTimeout(idleTimer);
      resize.disconnect();
      intersection.disconnect();
      stopSignals();
      document.removeEventListener("focusin", focusOrTouch);
      window.removeEventListener("pointermove", noteActivity);
      window.removeEventListener("pointerdown", noteActivity);
      document.removeEventListener("keydown", noteActivity);
      document.removeEventListener("input", noteActivity);
      scene.removeEventListener("pointerdown", focusOrTouch);
      document.removeEventListener("visibilitychange", suspend);
      preference.removeEventListener("change", suspend);
    },
  };
}
