import { createLoader, parseAsString, parseAsStringLiteral } from "nuqs/server";
import { pageParsers, periodParsers } from "@/lib/table-params";

export const PARTICIPANT_STATUSES = ["ativo", "nao_verificado", "bloqueado", "excluido"] as const;
export type ParticipantStatus = (typeof PARTICIPANT_STATUSES)[number];

const PARTICIPANT_SORTS = ["cadastro", "acesso", "participacoes"] as const;

/** Participant list state in the URL. */
export const participantParsers = {
  ...pageParsers,
  /** Name or e-mail, accent-insensitive. */
  q: parseAsString.withDefault(""),
  status: parseAsStringLiteral(PARTICIPANT_STATUSES),
  por: parseAsStringLiteral(PARTICIPANT_SORTS).withDefault("cadastro"),
  ...periodParsers,
};

/** Filters cleared together (the sort stays). */
export const PARTICIPANT_FILTERS = ["q", "status", "de", "ate"] as const;

export const loadParticipantParams = createLoader(participantParsers);
export type ParticipantParams = Awaited<ReturnType<typeof loadParticipantParams>>;
