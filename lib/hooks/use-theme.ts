import { useSyncExternalStore } from "react";
import { currentTheme, subscribeTheme, type Theme } from "@/lib/theme";

/** Current theme. On the server it is `undefined`: the <head> script decides before painting. */
export function useTheme(): Theme | undefined {
  return useSyncExternalStore(subscribeTheme, currentTheme, () => undefined);
}
