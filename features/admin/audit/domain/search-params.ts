import { createLoader, parseAsString } from "nuqs/server";
import { pageParsers, periodParsers } from "@/lib/table-params";

/** Audit screen state in the URL (server and client use the same parsers). */
export const auditParsers = {
  ...pageParsers,
  /** request_id or resource id (exact search). */
  q: parseAsString.withDefault(""),
  acao: parseAsString,
  recurso: parseAsString,
  autor: parseAsString,
  ...periodParsers,
};

export const loadAuditParams = createLoader(auditParsers);
export type AuditParams = Awaited<ReturnType<typeof loadAuditParams>>;
