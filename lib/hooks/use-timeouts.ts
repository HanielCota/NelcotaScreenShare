import { useEffect, useRef } from "react";

/** setTimeout that goes away with the component (nothing runs after unmount). */
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
