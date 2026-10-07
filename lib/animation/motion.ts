/** Motion conditions used across the app (GSAP, mascot, CSS-in-JS). */
export const MOTION_QUERIES = {
  motion: "(prefers-reduced-motion: no-preference)",
  reduced: "(prefers-reduced-motion: reduce)",
} as const;

/** Read on demand: the system preference can change while the page is open. */
export function prefersReducedMotion(): boolean {
  return window.matchMedia(MOTION_QUERIES.reduced).matches;
}
