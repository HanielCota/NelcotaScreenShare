import type { RefObject } from "react";
import { gsap, MOTION_QUERIES, useGSAP } from "./gsap";
import { ScrollTrigger } from "./gsap-scroll";

// Phones resize the viewport when the address bar hides: re-measuring pins mid-scroll jumps.
ScrollTrigger.config({ ignoreMobileResize: true });

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
        return setup(section);
      });
    },
    { scope },
  );
}
