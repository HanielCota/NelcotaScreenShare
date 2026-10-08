import type { RefObject } from "react";
import { gsap } from "@/lib/animation/gsap";
import { useScrollScene } from "@/lib/animation/scroll-scene";

/**
 * As the visitor scrolls into the story, the hero steps back (smaller, dimmer) instead of
 * just sliding away, so the product scene reads as the next layer. Scrubbed, so scrolling
 * back brings it forward again.
 */
export function useHeroRecede(hero: RefObject<HTMLElement | null>) {
  useScrollScene(hero, (element) => {
    gsap.to(element, {
      scale: 0.92,
      opacity: 0.25,
      y: -40,
      ease: "none",
      scrollTrigger: {
        trigger: element,
        start: "top top",
        end: "bottom top",
        scrub: true,
      },
    });
  });
}
