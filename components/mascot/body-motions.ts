/** Movimentos do corpo inteiro (Web Animations). Desligados com movimento reduzido. */
type Motion = { keyframes: Keyframe[]; options: KeyframeAnimationOptions };

/** Balança a cabeça como quem diz "não" (senha errada). */
export const SHAKE: Motion = {
  keyframes: [
    { translate: "0" },
    { translate: "-3% 0" },
    { translate: "2.5% 0" },
    { translate: "-2% 0" },
    { translate: "1% 0" },
    { translate: "0" },
  ],
  options: { duration: 450, easing: "ease-out" },
};

/** Pulinho de alegria: um pulo grande e um pequeno. */
export const JUMP: Motion = {
  keyframes: [
    { translate: "0 0" },
    { translate: "0 -8%", offset: 0.32 },
    { translate: "0 0", offset: 0.58 },
    { translate: "0 -3%", offset: 0.78 },
    { translate: "0 0" },
  ],
  options: { duration: 720, easing: "ease-out" },
};

/** Aceno de "isso aí" com a cabeça. */
export const NOD: Motion = {
  keyframes: [
    { translate: "0 0" },
    { translate: "0 2%" },
    { translate: "0 0" },
    { translate: "0 1.5%" },
    { translate: "0 0" },
  ],
  options: { duration: 480, easing: "ease-in-out" },
};

/** Encolhe no instante do toque (resposta imediata)... */
export const PRESS: Motion = {
  keyframes: [{ scale: "1" }, { scale: "0.92" }],
  options: { duration: 90, easing: "ease-out", fill: "forwards" },
};

/** ...e volta quicando ao soltar. */
export const BOUNCE: Motion = {
  keyframes: [
    { scale: "0.92" },
    { scale: "1.08", offset: 0.35 },
    { scale: "0.97", offset: 0.65 },
    { scale: "1.02", offset: 0.85 },
    { scale: "1" },
  ],
  options: { duration: 560, easing: "ease-out" },
};
