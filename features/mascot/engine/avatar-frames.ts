type Cell = { column: number; row: number };

const NEUTRAL: Cell = { column: 0, row: 0 };
const EYES_CLOSED: Cell = { column: 0, row: 1 };

/** Célula do atlas de cada expressão (as que faltam usam a neutra). */
const CELLS = new Map<string, Cell>([
  ["happy", { column: 1, row: 0 }],
  ["celebrate", { column: 1, row: 0 }],
  ["highFive", { column: 1, row: 0 }],
  ["presenting", { column: 1, row: 0 }],
  ["grumpy", { column: 1, row: 1 }],
  ["worried", { column: 1, row: 1 }],
  ["skeptical", { column: 1, row: 1 }],
  ["surprised", { column: 2, row: 1 }],
  ["ticklish", { column: 2, row: 1 }],
  ["asleep", EYES_CLOSED],
]);

/** Grade do atlas: três colunas, duas linhas, sem recortes sobre o rosto. */
export function avatarFrame(expression: string | undefined, lid0 = 0, lid1 = 0): Cell {
  // A piscada fecha só as pálpebras, sem baixar a mão durante o encontro.
  if (expression === "greeting") return { column: 2, row: 0 };
  if (expression === "yawning") return { column: 2, row: 1 };
  if (Math.max(lid0, lid1) > 0.85) return EYES_CLOSED;
  return (expression === undefined ? undefined : CELLS.get(expression)) ?? NEUTRAL;
}

/** Poses A/B do mesmo braço: a troca discreta mantém o desenho inteiro intacto. */
export const AVATAR_WAVE = [
  { transform: "translate(-33.333333%, 0)", offset: 0 },
  { transform: "translate(-66.666667%, 0)", offset: 0.2 },
  { transform: "translate(-33.333333%, 0)", offset: 0.4 },
  { transform: "translate(-66.666667%, 0)", offset: 0.6 },
  { transform: "translate(-33.333333%, 0)", offset: 0.8 },
  { transform: "translate(-33.333333%, 0)", offset: 1 },
].map((frame) => ({ ...frame, easing: "steps(1, end)" }));
