import { nextBlinkIn } from "@/features/mascot/domain/rules";

interface AmbientContext {
  /** Can it blink now (eyes open and calm, on screen)? */
  canBlink: () => boolean;
  blink: () => void;
  /** Can it sneeze now (quiet rest, nobody typing)? */
  canSneeze: () => boolean;
  sneeze: () => void;
}

/** What the mascot does on its own: blinks every few seconds and, rarely, sneezes. */
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
