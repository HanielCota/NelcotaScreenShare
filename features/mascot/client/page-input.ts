import { MOTION_QUERIES } from "@/lib/animation/motion";

/**
 * What happens on the page that matters to the mascots. A single set of
 * listeners serves every mascot on screen (the room mounts up to three):
 * attached on the first subscriber and detached when the last one leaves.
 */
export interface PageInputHandlers {
  pointerMove(event: PointerEvent): void;
  pointerOut(event: PointerEvent): void;
  pointerDown(event: PointerEvent): void;
  windowBlur(): void;
  windowFocus(): void;
  scroll(): void;
  /** Window size, motion preference, selection or field type changed. */
  layoutChange(): void;
  focusChange(event: FocusEvent): void;
  input(event: Event): void;
  key(event: Event): void;
  visibilityChange(): void;
}

const subscribers = new Set<PageInputHandlers>();
let detach: (() => void) | undefined;

function dispatch<E>(call: (handlers: PageInputHandlers, event: E) => void) {
  return (event: E) => {
    for (const handlers of subscribers) call(handlers, event);
  };
}

function attach(): () => void {
  const pointerMove = dispatch<PointerEvent>((handlers, event) => handlers.pointerMove(event));
  const pointerOut = dispatch<PointerEvent>((handlers, event) => handlers.pointerOut(event));
  const pointerDown = dispatch<PointerEvent>((handlers, event) => handlers.pointerDown(event));
  const windowBlur = dispatch<Event>((handlers) => handlers.windowBlur());
  const windowFocus = dispatch<Event>((handlers) => handlers.windowFocus());
  const scroll = dispatch<Event>((handlers) => handlers.scroll());
  const layoutChange = dispatch<unknown>((handlers) => handlers.layoutChange());
  const focusChange = dispatch<FocusEvent>((handlers, event) => handlers.focusChange(event));
  const input = dispatch<Event>((handlers, event) => handlers.input(event));
  const key = dispatch<Event>((handlers, event) => handlers.key(event));
  const visibilityChange = dispatch<Event>((handlers) => handlers.visibilityChange());
  const motionPreference = window.matchMedia(MOTION_QUERIES.reduced);

  // The password field changes type on "Mostrar senha": the eyes must follow.
  const typeObserver = new MutationObserver(() => layoutChange(undefined));
  typeObserver.observe(document.body, {
    subtree: true,
    attributes: true,
    attributeFilter: ["type"],
  });

  window.addEventListener("pointermove", pointerMove, { passive: true });
  document.addEventListener("pointerout", pointerOut, { passive: true });
  window.addEventListener("blur", windowBlur);
  window.addEventListener("focus", windowFocus);
  window.addEventListener("pointerdown", pointerDown, { passive: true });
  window.addEventListener("scroll", scroll, { passive: true, capture: true });
  window.addEventListener("resize", layoutChange);
  motionPreference.addEventListener("change", layoutChange);
  document.addEventListener("focusin", focusChange);
  document.addEventListener("focusout", focusChange);
  document.addEventListener("input", input);
  document.addEventListener("keydown", key);
  document.addEventListener("keyup", key);
  document.addEventListener("selectionchange", layoutChange);
  document.addEventListener("visibilitychange", visibilityChange);

  return () => {
    typeObserver.disconnect();
    window.removeEventListener("pointermove", pointerMove);
    document.removeEventListener("pointerout", pointerOut);
    window.removeEventListener("blur", windowBlur);
    window.removeEventListener("focus", windowFocus);
    window.removeEventListener("pointerdown", pointerDown);
    window.removeEventListener("scroll", scroll, { capture: true });
    window.removeEventListener("resize", layoutChange);
    motionPreference.removeEventListener("change", layoutChange);
    document.removeEventListener("focusin", focusChange);
    document.removeEventListener("focusout", focusChange);
    document.removeEventListener("input", input);
    document.removeEventListener("keydown", key);
    document.removeEventListener("keyup", key);
    document.removeEventListener("selectionchange", layoutChange);
    document.removeEventListener("visibilitychange", visibilityChange);
  };
}

export function subscribePageInput(handlers: PageInputHandlers): () => void {
  subscribers.add(handlers);
  detach ??= attach();
  return () => {
    subscribers.delete(handlers);
    if (subscribers.size === 0) {
      detach?.();
      detach = undefined;
    }
  };
}
