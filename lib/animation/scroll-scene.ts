import type { RefObject } from "react";
import { gsap, MOTION_QUERIES, useGSAP } from "./gsap";
import { ScrollTrigger } from "./gsap-scroll";

let refreshQueued = false;

/**
 * Puts every trigger back in page order and measures again, once per frame. A scene that is
 * created again (a media query flipped) lands at the end of ScrollTrigger's list; measured
 * from there, the pins below it would start at the wrong scroll positions.
 */
export function refreshInPageOrder() {
  if (refreshQueued) return;
  refreshQueued = true;
  requestAnimationFrame(() => {
    refreshQueued = false;
    ScrollTrigger.sort();
    ScrollTrigger.refresh();
  });
}

/**
 * A scroll-driven scene: `setup` runs only when the media query matches (motion allowed by
 * default) and everything it creates (tweens, pins, attributes) is reverted when it stops
 * matching or the component unmounts. Without motion the markup stays in its static state.
 */
export function useScrollScene<T extends HTMLElement>(
  scope: RefObject<T | null>,
  setup: (section: T) => void | (() => void),
  query: string = MOTION_QUERIES.motion,
) {
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(query, () => {
        const section = scope.current;
        if (!section) return undefined;
        const cleanup = setup(section);
        refreshInPageOrder();
        return () => {
          cleanup?.();
          refreshInPageOrder();
        };
      });
    },
    { scope },
  );
}
