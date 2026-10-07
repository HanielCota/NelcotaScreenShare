import { IDLE, type Gaze } from "./eye-tracking";
import type { Expression, FaceState } from "./face";
import type { Reason } from "./reasons";

/**
 * Regras do mascote que dependem só da expressão atual. Antes ficavam como
 * comparações `current === "…"` espalhadas pelo hook; aqui cada uma tem nome
 * e teste (tests/unit/mascot-rules.test.ts).
 */

const SLEEPING: ReadonlySet<Expression> = new Set(["sleepy", "asleep"]);
/** Bravo ou preocupado: o rosto do erro manda, sem brincadeira por cima. */
const UPSET: ReadonlySet<Expression> = new Set(["grumpy", "worried"]);

/** Sonolento ou dormindo: olhar parado, pálpebras e corpo lentos. */
export function isSleeping(expression: Expression): boolean {
  return SLEEPING.has(expression);
}

/** Expressões que não deixam começar (e interrompem) carinho, espirro e afins. */
export function blocksPlay(expression: Expression): boolean {
  return UPSET.has(expression) || expression === "skeptical" || expression === "asleep";
}

/** Piscar só com olhos abertos e calmos. */
export function canBlink(expression: Expression): boolean {
  return !isSleeping(expression) && !UPSET.has(expression);
}

/** Acenar ao passar o mouse: não com cara de erro. */
export function canGreet(expression: Expression): boolean {
  return !UPSET.has(expression);
}

/** Espirro de vez em quando: só em repouso tranquilo. */
export function canSneeze(expression: Expression): boolean {
  return expression === "neutral" || expression === "happy" || expression === "curious";
}

/**
 * O par da home só sai andando se nenhum dos dois está ocupado com isto
 * (ou com um gesto que não seja o próprio "toca aqui").
 */
const PAIR_BUSY_EXPRESSIONS: readonly Expression[] = [
  "asleep",
  "sleepy",
  "yawning",
  "grumpy",
  "worried",
  "skeptical",
];

/** Seletor CSS dos mascotes ocupados dentro do par (ver PAIR_BUSY_EXPRESSIONS). */
export const PAIR_BUSY_SELECTOR = [
  '[data-gesture]:not([data-gesture="highFive"])',
  ...PAIR_BUSY_EXPRESSIONS.map((expression) => `[data-expression="${expression}"]`),
].join(", ");

/** Para onde olhar além do ponteiro e do foco. */
export type GazeFocus = "idle" | "partner" | "stage" | "free";

export function gazeFocus(expression: Expression): GazeFocus {
  if (isSleeping(expression)) return "idle";
  if (expression === "greeting" || expression === "walking") return "partner";
  if (expression === "presenting") return "stage";
  return "free";
}

/** Molas criticamente amortecidas (sem quique); "response" em segundos, como na Apple. */
export const GAZE_RESPONSE = 0.14;
const FACE_RESPONSE = 0.32;
const SLEEP_RESPONSE = 0.85;

/** Dormindo, pálpebras, cabeça e corpo se acomodam devagar; o resto segue normal. */
export function faceResponse(expression: Expression, key: keyof FaceState): number {
  return isSleeping(expression) && key !== "pupil" ? SLEEP_RESPONSE : FACE_RESPONSE;
}

/** "Esperando": olhar indo e voltando devagar, de um lado ao outro. */
export function waitingGaze(time: number): Gaze {
  const x = Math.sin(time / 1100) * 0.55;
  return { ...IDLE, x, leftX: x, rightX: x };
}

/** "Ouvindo": inclina a cabeça e abre o olhar conforme a voz (0–1). */
export function listeningFace(face: FaceState, voice: number): FaceState {
  return { ...face, tilt: -4 + voice * 7, pupil: 1 + voice * 0.05 };
}

/** Pálpebra numa piscada de 180 ms (0 aberta → 1 fechada → 0). */
export const BLINK_MS = 180;
export function blinkLid(progress: number): number {
  return progress < 1 ? Math.sin(progress * Math.PI) ** 2 : 0;
}

/** Intervalo até a próxima piscada (aleatório para parecer natural). */
export function nextBlinkIn(random = Math.random()): number {
  return 2500 + random * 3500;
}

/** Quanto tempo ele olha pra algo que pediu atenção (ex.: o alerta de erro). */
export const ATTENTION_MS = 1500;
/** Fica com a cara do erro até a pessoa voltar a digitar (ou até passar esse tempo). */
const UPSET_MS = 4000;
export const HAPPY_AFTER_TYPING_MS = 2000;
const CELEBRATE_MS = 1600;
/** Intervalo mínimo entre dois acenos ao passar o mouse. */
export const GREETING_COOLDOWN_MS = 2500;

/** Sinais das telas (events.ts) traduzidos em mudanças de expressão e movimento. */
export interface SignalReaction {
  clear: Reason[];
  set?: { reason: Reason; expression: Expression; durationMs?: number };
  /** Desfaz o "doubt" (sinal de dúvida desligado). */
  unset?: Reason;
  motion?: "jump" | "shake" | "nod";
  wave?: "celebrate" | "simple";
  /** Para o aceno e o movimento atual antes de reagir. */
  stopGestures?: boolean;
  /** Olha para o elemento do sinal por um instante. */
  lookAtTarget?: boolean;
}

type Signal =
  | { type: "celebrate" }
  | { type: "upset"; mood: "grumpy" | "worried" }
  | { type: "doubt"; active: boolean }
  | { type: "nod" };

export function reactionTo(signal: Signal): SignalReaction {
  switch (signal.type) {
    case "celebrate":
      return {
        clear: ["error"],
        set: { reason: "celebrate", expression: "celebrate", durationMs: CELEBRATE_MS },
        motion: "jump",
        wave: "celebrate",
      };
    case "upset":
      return {
        clear: ["celebrate", "typing"],
        stopGestures: true,
        lookAtTarget: true,
        set: { reason: "error", expression: signal.mood, durationMs: UPSET_MS },
        ...(signal.mood === "grumpy" ? { motion: "shake" as const } : {}),
      };
    case "doubt":
      return signal.active
        ? { clear: [], set: { reason: "doubt", expression: "skeptical" } }
        : { clear: [], unset: "doubt" };
    case "nod":
      return { clear: [], motion: "nod", wave: "simple" };
  }
}
