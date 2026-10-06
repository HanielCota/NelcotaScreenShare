import { AVATAR_WAVE } from "./avatar-frames";

/** Gestos finitos; o mascote usa duas poses completas do mesmo braço. */
export function createHandMotions(root: HTMLElement) {
  const sprite = root.querySelector<HTMLElement>("[data-mascot-sprite]");
  let animation: Animation | undefined;
  const cancelSprite = () => {
    animation?.cancel();
    animation = undefined;
  };
  return {
    wave(celebrating = false) {
      cancelSprite();
      if (!sprite || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      animation = sprite.animate(AVATAR_WAVE, {
        duration: celebrating ? 1100 : 900,
        easing: "linear",
      });
    },
    cancel: cancelSprite,
  };
}
