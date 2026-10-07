"use client";

import { useEffect, useRef, useState } from "react";
import { Mascot } from "./Mascot";
import { onMascotSignal } from "@/features/mascot/events";
import { pairActivity, PAIR_STEP_MS, type PairPhase } from "@/features/mascot/engine/pair";
import { PAIR_BUSY_SELECTOR } from "@/features/mascot/engine/rules";
import { SLEEPY_AFTER_MS } from "@/features/mascot/engine/sleep";
import { MOTION_QUERIES } from "@/lib/motion";
import styles from "./MascotPair.module.css";

const { walk: WALK_MS, turn: TURN_MS } = PAIR_STEP_MS;
/** Sem atividade, o par para de andar junto com o sono do mascote. */
const IDLE_MS = SLEEPY_AFTER_MS;

/** Os dois percorrem a barra juntos; um relógio só mantém o encontro sincronizado. */
export function MascotPair({ pending }: { pending: boolean }) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<PairPhase>("rest");

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const motion = window.matchMedia(MOTION_QUERIES.reduced);
    scene.style.setProperty("--walk-duration", `${WALK_MS}ms`);
    let current: PairPhase = "rest";
    let timer = 0;
    let idleTimer = 0;
    let lastActivity = performance.now();
    let idle = false;
    let visible = true;
    let disposed = false;

    function change(next: PairPhase) {
      current = next;
      setPhase(next);
    }

    function later(delay: number, callback: () => void) {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (!disposed) callback();
      }, delay);
    }

    function available() {
      return (
        !pending &&
        !idle &&
        visible &&
        !document.hidden &&
        !motion.matches &&
        !document.activeElement?.matches(
          "input, textarea, [contenteditable=true], [data-mascot-action]",
        ) &&
        !scene?.querySelector(PAIR_BUSY_SELECTOR)
      );
    }

    function rest() {
      change("rest");
      if (!idle) later(TURN_MS, approach);
    }

    function retreat() {
      change("return");
      later(WALK_MS, rest);
    }

    function approach() {
      if (!available()) {
        if (!idle && !pending && visible && !document.hidden && !motion.matches)
          later(1000, approach);
        return;
      }
      change("approach");
      later(WALK_MS, () => {
        change("ready");
        later(PAIR_STEP_MS.ready, () => {
          change("hit");
          later(PAIR_STEP_MS.hit, () => {
            change("cheer");
            later(PAIR_STEP_MS.cheer, retreat);
          });
        });
      });
    }

    // Medimos só ao redimensionar: a caminhada anima transform, sem renders por quadro.
    function measure() {
      if (!scene) return;
      const width = scene.clientWidth;
      const size = scene.querySelector<HTMLElement>('[data-slot="mascot"]')?.offsetWidth ?? 112;
      const meeting = width / 2 - size * 0.39;
      const home = Math.max(size / 2, Math.min(width * 0.16, meeting));
      scene.style.setProperty("--walker-home", `${home}px`);
      scene.style.setProperty("--travel", `${Math.max(0, meeting - home)}px`);
    }

    function interrupt() {
      if (current === "rest" || current === "return") return;
      retreat();
    }

    function checkIdle() {
      const remaining = IDLE_MS - (performance.now() - lastActivity);
      if (remaining > 0) {
        idleTimer = window.setTimeout(checkIdle, remaining);
        return;
      }
      idleTimer = 0;
      idle = true;
      if (current === "rest") window.clearTimeout(timer);
      else interrupt();
    }

    function noteActivity() {
      lastActivity = performance.now();
      const waking = idle;
      idle = false;
      if (!idleTimer && !pending && visible && !document.hidden)
        idleTimer = window.setTimeout(checkIdle, IDLE_MS);
      if (waking && current === "rest") later(750, approach);
    }

    function suspend() {
      window.clearTimeout(timer);
      window.clearTimeout(idleTimer);
      idleTimer = 0;
      if (scene)
        scene.dataset.suspended = String(pending || !visible || document.hidden || motion.matches);
      change("rest");
      if (!pending && visible && !document.hidden && !motion.matches) {
        noteActivity();
        later(750, approach);
      }
    }

    function focusOrTouch(event: Event) {
      noteActivity();
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest("input, textarea, [contenteditable=true], [data-mascot-action]")
      )
        interrupt();
    }

    const resize = new ResizeObserver(measure);
    resize.observe(scene);
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? false;
      suspend();
    });
    intersection.observe(scene);
    const stopSignals = onMascotSignal(interrupt);
    document.addEventListener("focusin", focusOrTouch);
    window.addEventListener("pointermove", noteActivity, { passive: true });
    window.addEventListener("pointerdown", noteActivity, { passive: true });
    document.addEventListener("keydown", noteActivity);
    document.addEventListener("input", noteActivity);
    scene.addEventListener("pointerdown", focusOrTouch);
    document.addEventListener("visibilitychange", suspend);
    motion.addEventListener("change", suspend);
    measure();
    suspend();

    return () => {
      disposed = true;
      window.clearTimeout(timer);
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
      motion.removeEventListener("change", suspend);
    };
  }, [pending]);

  const activity = pairActivity(phase, pending);

  return (
    <div
      ref={sceneRef}
      data-mascot-pair=""
      data-phase={phase}
      data-pending={pending}
      className={styles.scene}
    >
      <div className={styles.visitor}>
        <div className={styles.actor}>
          <Mascot
            className={styles.mascot}
            sizes="(min-width: 640px) 384px, 336px"
            facing={phase === "return" ? "left" : "right"}
            activity={activity}
            canSleep={!pending}
          />
        </div>
      </div>
      <div className={styles.resident}>
        <div className={styles.actor}>
          <Mascot
            className={styles.mascot}
            sizes="(min-width: 640px) 384px, 336px"
            facing={phase === "return" ? "right" : "left"}
            activity={activity}
            canSleep={!pending}
          />
        </div>
      </div>
      <span aria-hidden="true" className={styles.message}>
        Toca aqui!
      </span>
      <svg aria-hidden="true" viewBox="0 0 40 40" className={styles.contact}>
        <path d="M20 5v7m-12 0 5 5m19-5-5 5M5 25l7-2m23 2-7-2" />
      </svg>
    </div>
  );
}
