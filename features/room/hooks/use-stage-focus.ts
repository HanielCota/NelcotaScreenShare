import type { TrackReference } from "@livekit/components-react";
import { useState } from "react";
import { pickFocusedShare, sortByOrder, trackShareOrder } from "@/features/room/domain/focus";

function sameOrder(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((sid, index) => sid === b[index]);
}

/**
 * Which screen goes on stage. LiveKit lists screens by participant (join
 * order), not by when they started: the order is remembered here so "most
 * recent" means the last screen to appear.
 */
export function useStageFocus(screenShares: TrackReference[]) {
  const [order, setOrder] = useState<string[]>([]);
  const [focusedSid, setFocusedSid] = useState<string>();
  const next = trackShareOrder(order, screenShares);

  // Adjusting state while rendering (React's "previous value" pattern): no extra frame.
  if (!sameOrder(next.order, order)) {
    setOrder(next.order);
    if (next.takesStage) setFocusedSid(undefined);
  }

  const shares = sortByOrder(screenShares, next.order);
  return { shares, focused: pickFocusedShare(shares, focusedSid), focus: setFocusedSid };
}
