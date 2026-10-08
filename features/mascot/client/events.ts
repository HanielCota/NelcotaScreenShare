import type { MascotSignal } from "@/features/mascot/domain/rules";

/**
 * How the rest of the system talks to the mascot. It does not know the screens: whoever knows what
 * happened (e.g. the login form) signals through here, and the mascot reacts.
 *
 * What is generic to any form (focus, typing, password field, Caps Lock), it
 * notices on its own.
 */

const listeners = new Set<(signal: MascotSignal) => void>();

function emit(signal: MascotSignal) {
  for (const listener of listeners) listener(signal);
}

export const celebrateMascot = () => emit({ type: "celebrate" });
export const upsetMascot = (mood: "grumpy" | "worried", target?: Element) =>
  emit({ type: "upset", mood, target });
export const setMascotDoubt = (active: boolean) => emit({ type: "doubt", active });
export const nodMascot = () => emit({ type: "nod" });

/** Used by the mascot to listen for signals. Returns the function that stops listening. */
export function onMascotSignal(listener: (signal: MascotSignal) => void): () => void {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}
