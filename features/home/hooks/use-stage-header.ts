import type { RefObject } from "react";
import { gsap, MOTION_QUERIES, useGSAP } from "@/lib/animation/gsap";
import { ScrollTrigger } from "@/lib/animation/gsap-scroll";
import { refreshInPageOrder } from "@/lib/animation/scroll-scene";

/**
 * While this dark stage passes under the fixed navigation, the bar turns dark too. Rebuilt
 * whenever the motion preference changes, after the scene's own pin: a pinned section sits
 * inside a pin-spacer, which is what holds its whole scroll length.
 */
export function useStageHeader(scope: RefObject<HTMLElement | null>) {
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add({ motion: MOTION_QUERIES.motion, reduced: MOTION_QUERIES.reduced }, () => {
        const stage = scope.current;
        const header = stage?.closest("main")?.querySelector("header");
        if (!stage || !header) return;
        const parent = stage.parentElement;
        ScrollTrigger.create({
          trigger: parent?.classList.contains("pin-spacer") ? parent : stage,
          start: "top 40px",
          end: "bottom 40px",
          toggleClass: { targets: header, className: "over-stage" },
        });
        refreshInPageOrder();
      });
    },
    { scope },
  );
}
