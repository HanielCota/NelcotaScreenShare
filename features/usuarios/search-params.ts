import { createLoader, parseAsString, parseAsStringLiteral } from "nuqs/server";
import { pageParsers } from "@/lib/table-params";

export const PARTICIPANT_STATUSES = ["ativo", "nao_verificado", "bloqueado", "excluido"] as const;
export type ParticipantStatus = (typeof PARTICIPANT_STATUSES)[number];

export const PARTICIPANT_SORTS = ["cadastro", "acesso", "participacoes"] as const;

/** Estado da lista de participantes na URL. */
export const participantParsers = {
  ...pageParsers,
  /** Nome ou e-mail, sem acento. */
  q: parseAsString.withDefault(""),
  status: parseAsStringLiteral(PARTICIPANT_STATUSES),
  por: parseAsStringLiteral(PARTICIPANT_SORTS).withDefault("cadastro"),
  /** Período de cadastro em dias de São Paulo: AAAA-MM-DD. */
  de: parseAsString,
  ate: parseAsString,
};

export const loadParticipantParams = createLoader(participantParsers);
export type ParticipantParams = Awaited<ReturnType<typeof loadParticipantParams>>;
