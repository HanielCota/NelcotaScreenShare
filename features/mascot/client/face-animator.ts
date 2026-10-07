import { IDLE, type Gaze } from "@/features/mascot/domain/eye-tracking";
import type { FaceState } from "@/features/mascot/domain/face";
import { BLINK_MS, blinkLid, GAZE_RESPONSE } from "@/features/mascot/domain/rules";
import { springStep } from "@/features/mascot/domain/spring";
import type { FaceRenderer } from "./face-renderer";

const ZERO_FACE: FaceState = { tilt: 0, pupil: 0, lid0: 0, lid1: 0, rest: 0 };

interface FrameHooks {
  /** Pode animar agora (montado, aba visível, mascote na tela)? */
  canRun: () => boolean;
  /** Ajustes por quadro (olhar do "esperando", voz do "ouvindo"); `keepAlive` mantém o laço. */
  beforeFrame: (time: number) => { gaze?: Gaze; face?: FaceState; keepAlive: boolean };
  /** Resposta da mola de cada traço do rosto (dormindo, mais lenta). */
  responseFor: (key: keyof FaceState) => number;
}

/**
 * Olhar e rosto animados por molas até os alvos, escritos direto no DOM a cada
 * quadro (sem render do React). O laço só roda enquanto algo não assentou.
 */
export function createFaceAnimator(renderer: FaceRenderer, initial: FaceState, hooks: FrameHooks) {
  let gazeTarget: Gaze = IDLE;
  let faceTarget: FaceState = { ...initial };
  const gaze: Gaze = { ...IDLE };
  const gazeVelocity: Gaze = { ...IDLE };
  const face: FaceState = { ...initial };
  const faceVelocity: FaceState = { ...ZERO_FACE };
  let frame = 0;
  let lastTime = 0;
  let blinkStarted = 0;

  function step(time: number) {
    if (!hooks.canRun()) {
      frame = 0;
      return;
    }
    // O horário do rAF é o do início do quadro e pode vir antes do lastTime: nunca negativo.
    const dt = Math.min(Math.max(0, (time - lastTime) / 1000), 1 / 30);
    lastTime = time;
    const extra = hooks.beforeFrame(time);
    if (extra.gaze) gazeTarget = extra.gaze;
    if (extra.face) faceTarget = extra.face;
    const gazeSettled = springStep(gaze, gazeVelocity, gazeTarget, GAZE_RESPONSE, dt);
    const faceSettled = springStep(face, faceVelocity, faceTarget, hooks.responseFor, dt);
    // O horário do rAF pode vir antes do blinkStarted: conta como início, sem descartar a piscada.
    const progress = blinkStarted ? Math.max(0, (time - blinkStarted) / BLINK_MS) : 1;
    const blinking = progress < 1;
    if (!blinking) blinkStarted = 0;
    const lid = blinkLid(progress);
    renderer.render(gaze, {
      ...face,
      lid0: Math.max(lid, face.lid0),
      lid1: Math.max(lid, face.lid1),
    });
    frame =
      gazeSettled && faceSettled && !blinking && !extra.keepAlive ? 0 : requestAnimationFrame(step);
  }

  return {
    setTargets(nextGaze: Gaze, nextFace: FaceState) {
      gazeTarget = nextGaze;
      faceTarget = nextFace;
    },
    /** Começa uma piscada (aparece no próximo quadro). */
    blink() {
      blinkStarted = performance.now();
    },
    cancelBlink() {
      blinkStarted = 0;
    },
    /** Garante o laço rodando (não duplica se já roda). */
    start() {
      if (frame) return;
      lastTime = performance.now();
      frame = requestAnimationFrame(step);
    },
    /** Para o laço e esquece a piscada (aba escondida, fora da tela). */
    pause() {
      cancelAnimationFrame(frame);
      frame = 0;
      blinkStarted = 0;
    },
    /** Movimento reduzido: vai direto aos alvos, sem molas. */
    snap() {
      cancelAnimationFrame(frame);
      frame = 0;
      Object.assign(gaze, gazeTarget);
      Object.assign(face, faceTarget);
      Object.assign(gazeVelocity, IDLE);
      Object.assign(faceVelocity, ZERO_FACE);
      renderer.render(gaze, face);
    },
    dispose() {
      cancelAnimationFrame(frame);
      frame = 0;
    },
  };
}
