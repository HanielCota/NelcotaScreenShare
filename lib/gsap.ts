"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { Flip } from "gsap/Flip";

// Registro único dos plugins (módulo avaliado uma vez por bundle de cliente).
gsap.registerPlugin(useGSAP, Flip, CustomEase);

CustomEase.create("smooth", "M0,0 C0.16,1 0.3,1 1,1");
gsap.defaults({ ease: "smooth", duration: 0.6 });

/** Condições do `gsap.matchMedia()` usadas em todo o app. */
export const MOTION_QUERIES = {
  motion: "(prefers-reduced-motion: no-preference)",
  reduced: "(prefers-reduced-motion: reduce)",
} as const;

/** Para animações disparadas por evento, fora de um `gsap.matchMedia()`. */
export function prefersReducedMotion(): boolean {
  return window.matchMedia(MOTION_QUERIES.reduced).matches;
}

export { gsap, useGSAP, Flip };
