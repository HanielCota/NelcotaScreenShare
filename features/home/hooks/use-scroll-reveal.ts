import type { RefObject } from "react";
import { gsap, MOTION_DURATION, MOTION_QUERIES, useGSAP } from "@/lib/animation/gsap";
import { ScrollTrigger, SplitText } from "@/lib/animation/gsap-scroll";

const REVEAL_START = "top 85%";

/**
 * Home sections rise into view once, as the visitor scrolls:
 * - `[data-reveal-heading]` reveals word by word (the text stays readable to screen readers);
 * - `[data-reveal]` items rise in small batches, so a grid enters row by row.
 * Without motion (or before hydration) everything is simply visible.
 */
export function useScrollReveal(scope: RefObject<HTMLElement | null>) {
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      // Manrope changes line heights when it arrives; trigger positions follow it.
      void document.fonts.ready.then(() => ScrollTrigger.refresh());

      mm.add(MOTION_QUERIES.motion, () => {
        for (const heading of gsap.utils.toArray<HTMLElement>("[data-reveal-heading]")) {
          SplitText.create(heading, {
            type: "words",
            aria: "auto",
            onSplit: (split) => {
              gsap.from(split.words, {
                yPercent: 40,
                opacity: 0,
                duration: MOTION_DURATION.entrance,
                stagger: 0.04,
                scrollTrigger: { trigger: heading, start: REVEAL_START, once: true },
              });
            },
          });
        }

        const items = gsap.utils.toArray<HTMLElement>("[data-reveal]");
        if (items.length === 0) return;
        gsap.set(items, { y: 16, opacity: 0 });
        ScrollTrigger.batch(items, {
          start: REVEAL_START,
          once: true,
          onEnter: (batch) =>
            gsap.to(batch, {
              y: 0,
              opacity: 1,
              duration: MOTION_DURATION.entrance,
              stagger: 0.06,
              clearProps: "transform,opacity",
            }),
        });
      });
    },
    { scope },
  );
}
