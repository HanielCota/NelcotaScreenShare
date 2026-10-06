/** Grade do atlas: três colunas, duas linhas, sem recortes sobre o rosto. */
export function avatarFrame(expression: string | undefined, lid0 = 0, lid1 = 0) {
  if (Math.max(lid0, lid1) > 0.85) return { column: 0, row: 1 };
  switch (expression) {
    case "happy":
    case "celebrate":
      return { column: 1, row: 0 };
    case "grumpy":
    case "worried":
    case "skeptical":
      return { column: 1, row: 1 };
    case "surprised":
      return { column: 2, row: 1 };
    case "asleep":
      return { column: 0, row: 1 };
    default:
      return { column: 0, row: 0 };
  }
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
