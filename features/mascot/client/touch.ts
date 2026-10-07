import { PRESS, type Motion } from "@/features/mascot/domain/body-motions";
import type { Expression } from "@/features/mascot/domain/face";
import type { createPersonality, MascotActivity } from "@/features/mascot/domain/personality";
import { canGreet, GREETING_COOLDOWN_MS } from "@/features/mascot/domain/rules";
import type { createHandMotions } from "./hand-motions";

interface TouchContext {
  root: HTMLElement;
  hands: ReturnType<typeof createHandMotions>;
  personality: ReturnType<typeof createPersonality>;
  move(motion: Motion): Animation | undefined;
  onActivity(): void;
  current(): Expression;
  activity(): MascotActivity;
  visible(): boolean;
  /** Dormindo ou sonolento: não acena ao terminar de carregar. */
  sleeping(): boolean;
}

/**
 * Interações com o próprio mascote: encolhe no toque e reage ao soltar em cima
 * dele (arrastar pra fora desfaz); acena quando o mouse chega.
 */
export function attachTouch(ctx: TouchContext) {
  const { root, hands, personality } = ctx;
  let pressAnimation: Animation | undefined;
  let lastGreeting = -Infinity;

  const onPress = (event: PointerEvent) => {
    if (!event.isPrimary || event.button !== 0) return;
    if (!(event.target instanceof Element) || !event.target.closest("[data-mascot-action]")) return;
    hands.cancel();
    pressAnimation?.cancel();
    pressAnimation = ctx.move(PRESS);
  };
  const cancelPress = () => {
    pressAnimation?.cancel();
    pressAnimation = undefined;
  };
  const onClick = (event: MouseEvent) => {
    const action =
      event.target instanceof Element
        ? event.target.closest<HTMLElement>("[data-mascot-action]")?.dataset.mascotAction
        : undefined;
    cancelPress();
    ctx.onActivity();
    if (action === "pet") personality.pet();
    else if (action === "high-five") personality.highFive();
  };
  /** Mouse chegou: oferece um "toca aqui" ou só acena (não muito seguido). */
  const greet = () => {
    ctx.onActivity();
    if (ctx.activity() !== "idle" || personality.active) return;
    if (!canGreet(ctx.current())) return;
    if (!ctx.visible() || performance.now() - lastGreeting < GREETING_COOLDOWN_MS) return;
    lastGreeting = performance.now();
    if (!personality.offerHighFive()) hands.wave();
  };

  // O primeiro aceno acontece quando todas as camadas (imagens) estão visíveis.
  const images = [...root.querySelectorAll("img")];
  let greeted = false;
  const greetWhenReady = () => {
    if (greeted || !images.every((image) => image.complete && image.naturalWidth > 0)) return;
    greeted = true;
    if (!ctx.sleeping()) greet();
  };
  images.forEach((image) => image.addEventListener("load", greetWhenReady));

  root.addEventListener("pointerdown", onPress);
  root.addEventListener("pointerenter", greet);
  root.addEventListener("click", onClick);
  root.addEventListener("pointerup", cancelPress);
  root.addEventListener("pointerleave", cancelPress);
  root.addEventListener("pointercancel", cancelPress);

  return {
    greetWhenReady,
    cancelPress,
    detach() {
      images.forEach((image) => image.removeEventListener("load", greetWhenReady));
      root.removeEventListener("pointerdown", onPress);
      root.removeEventListener("pointerenter", greet);
      root.removeEventListener("click", onClick);
      root.removeEventListener("pointerup", cancelPress);
      root.removeEventListener("pointerleave", cancelPress);
      root.removeEventListener("pointercancel", cancelPress);
    },
  };
}
