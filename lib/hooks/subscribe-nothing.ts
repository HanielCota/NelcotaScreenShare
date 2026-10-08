/**
 * `useSyncExternalStore` subscription for values that never change after hydration:
 * the server snapshot renders first, then the client one, and nothing to listen to.
 */
export function subscribeNothing(): () => void {
  return () => {};
}
