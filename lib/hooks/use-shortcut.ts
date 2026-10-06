"use client";

import { useEffect, useEffectEvent } from "react";

function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || target.matches("input, textarea, select"))
  );
}

/**
 * Atalho de uma tecla, sem modificadores. Ignorado enquanto a pessoa digita
 * (chat, campos) e com a tecla segurada. `key` em minúsculas, como "m".
 */
export function useShortcut(key: string, onPress: () => void, enabled = true) {
  const handle = useEffectEvent(onPress);

  useEffect(() => {
    if (!enabled) return;
    const listener = (event: KeyboardEvent) => {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key.toLowerCase() !== key || isTyping(event.target)) return;
      event.preventDefault();
      handle();
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [key, enabled]);
}
