import { useSyncExternalStore } from "react";
import { subscribeNothing } from "@/lib/hooks/subscribe-nothing";
import { currentShareSupport, type ShareSupport } from "@/features/room/domain/share-support";

/**
 * What this browser can share. The server cannot know, so it is `null` until
 * hydration (nothing renders wrong text in the meantime).
 */
export function useShareSupport(): ShareSupport | null {
  return useSyncExternalStore<ShareSupport | null>(
    subscribeNothing,
    currentShareSupport,
    () => null,
  );
}
