import { useRef, type ReactNode } from "react";
import { useLocation, useViewTransitionState } from "react-router";
import { gsap, MOTION_DURATION, MOTION_QUERIES, useGSAP } from "@/lib/animation/gsap";

/** Home entrance: the blocks marked with data-anim rise in sequence. */
export function HomeEntrance({ className, children }: { className: string; children: ReactNode }) {
  const scope = useRef<HTMLElement>(null);
  const transitioning = useViewTransitionState(useLocation().pathname);

  useGSAP(
    () => {
      // Let the router capture the fully visible page for its cross-fade.
      if (transitioning) return;
      const media = gsap.matchMedia();

      media.add(MOTION_QUERIES.motion, () => {
        gsap.from("[data-anim]", {
          y: 10,
          opacity: 0,
          duration: MOTION_DURATION.entrance,
          stagger: 0.045,
          clearProps: "transform,opacity",
        });
      });

      media.add(MOTION_QUERIES.reduced, () => {
        gsap.set("[data-anim]", { opacity: 1 });
      });
    },
    { scope },
  );

  return (
    <main ref={scope} className={className}>
      {children}
    </main>
  );
}
