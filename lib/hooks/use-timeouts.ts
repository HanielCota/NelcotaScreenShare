"use client";

import { useEffect, useRef } from "react";

/** setTimeout que some junto com o componente (nada roda depois de desmontar). */
export function useTimeouts() {
  const timers = useRef(new Set<number>());

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending) window.clearTimeout(timer);
      pending.clear();
    };
  }, []);

  return function later(callback: () => void, delayMs: number) {
    const timer = window.setTimeout(() => {
      timers.current.delete(timer);
      callback();
    }, delayMs);
    timers.current.add(timer);
  };
}
