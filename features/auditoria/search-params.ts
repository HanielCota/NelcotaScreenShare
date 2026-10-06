import { createLoader, parseAsString } from "nuqs/server";
import { pageParsers } from "@/lib/table-params";

/** Estado da tela de auditoria na URL (servidor e cliente usam os mesmos parsers). */
export const auditParsers = {
  ...pageParsers,
  /** request_id ou id do recurso (busca exata). */
  q: parseAsString.withDefault(""),
  acao: parseAsString,
  recurso: parseAsString,
  autor: parseAsString,
  /** Período em dias de São Paulo: AAAA-MM-DD. */
  de: parseAsString,
  ate: parseAsString,
};

export const loadAuditParams = createLoader(auditParsers);
export type AuditParams = Awaited<ReturnType<typeof loadAuditParams>>;
