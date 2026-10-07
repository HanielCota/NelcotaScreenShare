import { AVATAR_WAVE } from "@/features/mascot/engine/avatar-frames";
import { prefersReducedMotion } from "@/lib/motion";

/** Gestos finitos; o mascote usa duas poses completas do mesmo braço. */
export function createHandMotions(root: HTMLElement) {
  const sprite = root.querySelector<HTMLElement>("[data-mascot-sprite]");
  let animation: Animation | undefined;
  const cancelSprite = () => {
    animation?.cancel();
    animation = undefined;
  };
  return {
    hold() {
      cancelSprite();
      if (!sprite || prefersReducedMotion()) return;
      // Com movimento reduzido, a expressão já usa a pose estática de mão levantada.
      animation = sprite.animate([{ transform: "translate(-66.666667%, 0)" }], {
        duration: 1,
        fill: "forwards",
      });
    },
    wave(celebrating = false) {
      cancelSprite();
      if (!sprite || prefersReducedMotion()) return;
      animation = sprite.animate(AVATAR_WAVE, {
        duration: celebrating ? 1100 : 900,
        easing: "linear",
      });
    },
    cancel: cancelSprite,
  };
}
