import { useRef, type ReactNode } from "react";
import { gsap, MOTION_QUERIES, useGSAP } from "@/lib/animation/gsap";

/** Entrada da home: os blocos marcados com data-anim sobem em sequência. */
export function HomeEntrance({ className, children }: { className: string; children: ReactNode }) {
  const scope = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(MOTION_QUERIES.motion, () => {
        gsap.from("[data-anim]", {
          y: 24,
          opacity: 0,
          duration: 0.9,
          stagger: 0.09,
          ease: "expo.out",
        });
      });

      mm.add(MOTION_QUERIES.reduced, () => {
        gsap.from("[data-anim]", { opacity: 0, duration: 0.3 });
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
