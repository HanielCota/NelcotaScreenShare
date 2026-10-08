import { useSyncExternalStore } from "react";
import { currentShareSupport, type ShareSupport } from "@/features/room/domain/share-support";

const noop = () => () => {};

/**
 * What this browser can share. The server cannot know, so it is `null` until
 * hydration (nothing renders wrong text in the meantime).
 */
export function useShareSupport(): ShareSupport | null {
  return useSyncExternalStore<ShareSupport | null>(noop, currentShareSupport, () => null);
}
