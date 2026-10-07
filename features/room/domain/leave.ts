/**
 * Por que a pessoa está na tela de saída. Cada motivo tem título e ações
 * próprios: quem saiu de propósito volta para a sala; quem foi removido, não.
 */
export type LeaveReason =
  /** Clicou em Sair. */
  | "self"
  /** A sala foi encerrada (ou apagada no painel). */
  | "ended"
  /** Alguém tirou a pessoa da sala. */
  | "removed"
  /** Entrou na mesma sala em outra aba ou aparelho. */
  | "elsewhere"
  /** A conexão caiu no meio da chamada. */
  | "dropped"
  /** Nem chegou a entrar (token negado, conexão não abriu). */
  | "failed";

export interface LeaveNotice {
  reason: LeaveReason;
  message?: string;
}

/** Tempo na chamada, ou `undefined` se a hora de entrada não for conhecida. */
export function callDuration(startedAt: number | undefined, now: number): number | undefined {
  if (startedAt === undefined || !Number.isFinite(startedAt)) return undefined;
  return Math.max(0, now - startedAt);
}

/** "menos de 1 min", "42 min", "1 h 05 min". */
export function formatCallDuration(ms: number): string {
  const minutes = Math.floor(Math.max(0, ms) / 60_000);
  if (minutes < 1) return "menos de 1 min";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours} h ${String(minutes % 60).padStart(2, "0")} min`;
}
