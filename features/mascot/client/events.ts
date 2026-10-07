/**
 * How the rest of the system talks to the mascot. It does not know the screens: whoever knows what
 * happened (e.g. the login form) signals through here, and the mascot reacts.
 *
 * What is generic to any form (focus, typing, password field, Caps Lock), it
 * notices on its own.
 */

export type MascotSignal =
  /** It worked: a little jump of joy. */
  | { type: "celebrate" }
  /**
   * It failed. `grumpy`: error caused by the attempt (frowns and shakes its head);
   * `worried`: everything else (gets worried about the person). `target`: where it looks.
   */
  | { type: "upset"; mood: "grumpy" | "worried"; target?: Element | undefined }
  /** Suspicious (e.g. an email that looks mistyped) until `active` turns false again. */
  | { type: "doubt"; active: boolean }
  /** Approving nod (e.g. the email is complete). */
  | { type: "nod" };

const MASCOT_EVENT = "mascot:signal";

function emit(signal: MascotSignal) {
  window.dispatchEvent(new CustomEvent<MascotSignal>(MASCOT_EVENT, { detail: signal }));
}

export const celebrateMascot = () => emit({ type: "celebrate" });
export const upsetMascot = (mood: "grumpy" | "worried", target?: Element) =>
  emit({ type: "upset", mood, target });
export const setMascotDoubt = (active: boolean) => emit({ type: "doubt", active });
export const nodMascot = () => emit({ type: "nod" });

/** Used by the mascot to listen for signals. Returns the function that stops listening. */
export function onMascotSignal(listener: (signal: MascotSignal) => void): () => void {
  const handler = (event: Event) => {
    if (!(event instanceof CustomEvent)) return;
    const signal: unknown = event.detail;
    if (isMascotSignal(signal)) listener(signal);
  };
  window.addEventListener(MASCOT_EVENT, handler);
  return () => window.removeEventListener(MASCOT_EVENT, handler);
}

function isMascotSignal(signal: unknown): signal is MascotSignal {
  if (!signal || typeof signal !== "object" || !("type" in signal)) return false;
  switch (signal.type) {
    case "celebrate":
    case "nod":
      return true;
    case "doubt":
      return "active" in signal && typeof signal.active === "boolean";
    case "upset":
      return (
        "mood" in signal &&
        (signal.mood === "grumpy" || signal.mood === "worried") &&
        (!("target" in signal) || signal.target === undefined || signal.target instanceof Element)
      );
    default:
      return false;
  }
}
