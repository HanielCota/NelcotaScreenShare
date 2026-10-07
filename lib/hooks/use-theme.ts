import { useSyncExternalStore } from "react";
import { currentTheme, subscribeTheme, type Theme } from "@/lib/theme";

/** Tema atual. No servidor é `undefined`: o script do <head> decide antes de pintar. */
export function useTheme(): Theme | undefined {
  return useSyncExternalStore(subscribeTheme, currentTheme, () => undefined);
}
