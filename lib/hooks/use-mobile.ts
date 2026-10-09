import * as React from "react";

const MOBILE_BREAKPOINT = 768;
const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

function subscribe(onChange: () => void) {
  const mediaQuery = window.matchMedia(QUERY);
  mediaQuery.addEventListener("change", onChange);
  return () => mediaQuery.removeEventListener("change", onChange);
}

/** Phone screen? (On the server, "no": the first client render corrects it without an effect.) */
export function useIsMobile() {
  return React.useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
