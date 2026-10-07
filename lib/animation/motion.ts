/** Condições de movimento usadas em todo o app (GSAP, mascote, CSS em JS). */
export const MOTION_QUERIES = {
  motion: "(prefers-reduced-motion: no-preference)",
  reduced: "(prefers-reduced-motion: reduce)",
} as const;

/** Lida na hora: a preferência do sistema pode mudar com a página aberta. */
export function prefersReducedMotion(): boolean {
  return window.matchMedia(MOTION_QUERIES.reduced).matches;
}
