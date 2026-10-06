import { PRIORITY, type Expression } from "./face";

/** Motivos que mudam a expressão. Cada um dura até um prazo ou até ser removido. */
export type Reason =
  | "celebrate"
  | "error"
  | "capsLock"
  | "doubt"
  | "tap"
  | "typing"
  | "sleep"
  | "interaction"
  | "context"
  | "curiosity";

/**
 * Os motivos ativos da expressão, com prazo. A expressão mostrada é a do motivo de maior
 * prioridade (PRIORITY); sem nenhum, a de repouso.
 */
export function createReasons(now: () => number = () => performance.now()) {
  const reasons = new Map<Reason, { expression: Expression; until: number }>();

  return {
    set(reason: Reason, expression: Expression, durationMs = Infinity) {
      reasons.set(reason, { expression, until: now() + durationMs });
    },
    /** Remove o motivo; diz se ele existia. */
    delete(reason: Reason): boolean {
      return reasons.delete(reason);
    },
    /** Expressão que aparece agora (e descarta os motivos vencidos). */
    current(base: Expression): Expression {
      const time = now();
      let best = base;
      let bestRank = Number.POSITIVE_INFINITY;
      for (const [reason, entry] of reasons) {
        if (entry.until <= time) {
          reasons.delete(reason);
          continue;
        }
        const rank = PRIORITY.indexOf(entry.expression);
        if (rank !== -1 && rank < bestRank) {
          best = entry.expression;
          bestRank = rank;
        }
      }
      return best;
    },
    /** Quando vence o próximo motivo (Infinity se nenhum vence sozinho). */
    nextExpiry(): number {
      return Math.min(...[...reasons.values()].map((entry) => entry.until));
    },
  };
}
