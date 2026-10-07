import { MOTION_QUERIES } from "@/lib/motion";

/**
 * O que acontece na página e interessa aos mascotes. Um único conjunto de
 * listeners serve a todos os mascotes da tela (a sala chega a montar três):
 * liga no primeiro que assina e desliga quando o último sai.
 */
export interface PageInputHandlers {
  pointerMove(event: PointerEvent): void;
  pointerOut(event: PointerEvent): void;
  pointerDown(event: PointerEvent): void;
  windowBlur(): void;
  windowFocus(): void;
  scroll(): void;
  /** Tamanho da janela, preferência de movimento, seleção ou tipo de campo mudaram. */
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
  const pointerMove = dispatch<PointerEvent>((h, e) => h.pointerMove(e));
  const pointerOut = dispatch<PointerEvent>((h, e) => h.pointerOut(e));
  const pointerDown = dispatch<PointerEvent>((h, e) => h.pointerDown(e));
  const windowBlur = dispatch<Event>((h) => h.windowBlur());
  const windowFocus = dispatch<Event>((h) => h.windowFocus());
  const scroll = dispatch<Event>((h) => h.scroll());
  const layoutChange = dispatch<unknown>((h) => h.layoutChange());
  const focusChange = dispatch<FocusEvent>((h, e) => h.focusChange(e));
  const input = dispatch<Event>((h, e) => h.input(e));
  const key = dispatch<Event>((h, e) => h.key(e));
  const visibilityChange = dispatch<Event>((h) => h.visibilityChange());
  const motionPreference = window.matchMedia(MOTION_QUERIES.reduced);

  // O campo de senha troca de tipo ao "Mostrar senha": os olhos precisam acompanhar.
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
