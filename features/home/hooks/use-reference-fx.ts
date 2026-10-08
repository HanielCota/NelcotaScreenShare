import type { RefObject } from "react";
import { gsap } from "@/lib/animation/gsap";
import { useScrollScene } from "@/lib/animation/scroll-scene";

/** A scroll window for one element: the effect plays while it crosses this band. */
function band(trigger: Element) {
  return { trigger, start: "top 92%", end: "top 70%", scrub: 0.6 };
}

/**
 * Scroll effect for the reference sections (details, browsers, price, updates, FAQ): each
 * title and each block marked `data-fx` rises a little into place. One effect, on purpose,
 * after the pinned scenes above; scrubbed, so it follows the scroll both ways. With reduced
 * motion it is not created and the content stays as rendered.
 */
export function useReferenceFx(scope: RefObject<HTMLElement | null>) {
  useScrollScene(scope, (root) => {
    for (const block of gsap.utils.toArray<HTMLElement>("[data-fx]", root)) {
      gsap.from(block, { y: 24, opacity: 0.2, ease: "none", scrollTrigger: band(block) });
    }
  });
}
