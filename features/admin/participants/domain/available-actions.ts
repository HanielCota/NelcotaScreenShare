import type { ParticipantStatus } from "./search-params";

export interface ParticipantState {
  status: ParticipantStatus;
  verified: boolean;
  anonymized: boolean;
  /** Sessions open right now. */
  sessions: number;
  can: { update: boolean; delete: boolean; anonymize: boolean };
}

/** Which actions show on the participant detail, by status and permissions. */
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
