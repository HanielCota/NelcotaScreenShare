/** Motion conditions used across the app (GSAP, mascot, CSS-in-JS). */
export const MOTION_QUERIES = {
  motion: "(prefers-reduced-motion: no-preference)",
  reduced: "(prefers-reduced-motion: reduce)",
} as const;

/** Shared timings in seconds: feedback, surfaces, entrances and rearrangement. */
export const MOTION_DURATION = {
  feedback: 0.16,
  surface: 0.28,
  entrance: 0.42,
  layout: 0.45,
} as const;

/** Read on demand: the system preference can change while the page is open. */
export function prefersReducedMotion(): boolean {
  return window.matchMedia(MOTION_QUERIES.reduced).matches;
}
