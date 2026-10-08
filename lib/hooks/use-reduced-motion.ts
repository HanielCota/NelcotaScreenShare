import { useSyncExternalStore } from "react";
import { MOTION_QUERIES, prefersReducedMotion } from "@/lib/animation/motion";

function subscribe(onChange: () => void) {
  const media = window.matchMedia(MOTION_QUERIES.reduced);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

/** Updates mounted animations when the system preference changes. */
export function useReducedMotion() {
  return useSyncExternalStore(subscribe, prefersReducedMotion, () => true);
}
