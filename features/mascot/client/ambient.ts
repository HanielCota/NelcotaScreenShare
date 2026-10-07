import { nextBlinkIn } from "@/features/mascot/domain/rules";

interface AmbientContext {
  /** Pode piscar agora (olhos abertos e calmos, na tela)? */
  canBlink: () => boolean;
  blink: () => void;
  /** Pode espirrar agora (repouso tranquilo, ninguém digitando)? */
  canSneeze: () => boolean;
  sneeze: () => void;
}

/** O que o mascote faz sozinho: pisca a cada poucos segundos e, raramente, espirra. */
export function startAmbient(ctx: AmbientContext) {
  let blinkTimer = 0;
  let quirkTimer = 0;

  const blinkLoop = () => {
    if (ctx.canBlink()) ctx.blink();
    blinkTimer = window.setTimeout(blinkLoop, nextBlinkIn());
  };
  const quirkLoop = () => {
    if (ctx.canSneeze()) ctx.sneeze();
    quirkTimer = window.setTimeout(quirkLoop, 65_000 + Math.random() * 25_000);
  };
  blinkTimer = window.setTimeout(blinkLoop, 2000);
  quirkTimer = window.setTimeout(quirkLoop, 18_000 + Math.random() * 5000);

  return () => {
    window.clearTimeout(blinkTimer);
    window.clearTimeout(quirkTimer);
  };
}
