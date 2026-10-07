import type { ParticipantStatus } from "./search-params";

export interface ParticipantState {
  status: ParticipantStatus;
  verified: boolean;
  anonymized: boolean;
  /** Sessões abertas agora. */
  sessions: number;
  can: { update: boolean; delete: boolean; anonymize: boolean };
}

/** Quais ações aparecem no detalhe do participante, pelo status e pelas permissões. */
export function availableActions({
  status,
  verified,
  anonymized,
  sessions,
  can,
}: ParticipantState) {
  const deleted = status === "excluido";
  return {
    unblock: can.update && !deleted && status === "bloqueado",
    block: can.update && !deleted && status !== "bloqueado",
    revokeSessions: can.update && sessions > 0,
    resendVerification: can.update && !verified && !deleted,
    restore: can.delete && deleted && !anonymized,
    delete: can.delete && !deleted,
    anonymize: can.anonymize && !anonymized,
  };
}
