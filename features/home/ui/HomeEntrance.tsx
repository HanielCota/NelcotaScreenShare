import { useRef, type ReactNode } from "react";
import { gsap, MOTION_QUERIES, useGSAP } from "@/lib/animation/gsap";

/** Home entrance: the blocks marked with data-anim rise in sequence. */
export function HomeEntrance({ className, children }: { className: string; children: ReactNode }) {
  const scope = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(MOTION_QUERIES.motion, () => {
        gsap.from("[data-anim]", {
          y: 12,
          opacity: 0,
          duration: 0.28,
          stagger: 0.035,
          ease: "expo.out",
        });
      });

      mm.add(MOTION_QUERIES.reduced, () => {
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
