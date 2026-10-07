import { useEffect, useRef, type RefObject } from "react";
import { gsap, MOTION_QUERIES, prefersReducedMotion, useGSAP } from "@/lib/animation/gsap";
import { Flip } from "@/lib/animation/gsap-flip";

const FLIP_TARGETS = "[data-flip-id]";

function flipState(root: HTMLElement) {
  return Flip.getState(gsap.utils.toArray<HTMLElement>(FLIP_TARGETS, root));
}

/**
 * Room animations:
 * - entrance of the top bar and the dock;
 * - staggered entrance of the tiles;
 * - smooth rearrangement with Flip when the layout changes (someone starts/stops
 *   sharing, joins or leaves). The "before" state is captured whenever an
 *   animation finishes and when the container resizes, so it serves as the
 *   starting point for the next change.
 */
export function useRoomAnimations(scope: RefObject<HTMLElement | null>, layoutKey: string) {
  const lastState = useRef<Flip.FlipState | null>(null);
  const running = useRef<gsap.core.Timeline | null>(null);

  // Entrance of the fixed UI (top bar and dock).
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_QUERIES.motion, () => {
        gsap.from("[data-anim=topbar]", { y: -20, opacity: 0, duration: 0.7 });
        gsap.from("[data-anim=dock]", { y: 40, opacity: 0, duration: 0.7, delay: 0.2 });
      });
    },
    { scope },
  );

  // Layout: Flip from the last known state.
  useGSAP(
    () => {
      const root = scope.current;
      if (!root) return;
      const targets = gsap.utils.toArray<HTMLElement>(FLIP_TARGETS, root);
      const capture = () => {
        lastState.current = flipState(root);
        running.current = null;
      };

      if (prefersReducedMotion()) {
        gsap.set(targets, { opacity: 1, clearProps: "transform" });
        capture();
        return;
      }

      running.current?.progress(1).kill();

      const previous = lastState.current;
      if (!previous) {
        running.current = gsap.timeline({ onComplete: capture }).from(targets, {
          opacity: 0,
          y: 24,
          scale: 0.94,
          duration: 0.7,
          stagger: 0.08,
          delay: 0.15,
        });
        return;
      }

      running.current = Flip.from(previous, {
        targets,
        duration: 0.75,
        ease: "smooth",
        scale: true,
        prune: true,
        onEnter: (elements) =>
          gsap.fromTo(
            elements,
            { opacity: 0, scale: 0.92 },
            { opacity: 1, scale: 1, duration: 0.6, stagger: 0.06, delay: 0.1 },
          ),
        onComplete: capture,
      });
    },
    { scope, dependencies: [layoutKey] },
  );

  // Resizing changes positions without changing layoutKey: update the base state.
  useEffect(() => {
    const root = scope.current;
    if (!root) return;
    const observer = new ResizeObserver(() => {
      if (running.current?.isActive()) return;
      lastState.current = flipState(root);
    });
    observer.observe(root);
    return () => observer.disconnect();
  }, [scope]);
}
