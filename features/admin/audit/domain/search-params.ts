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

/** Filters cleared together (the sort stays). */
export const AUDIT_FILTERS = ["q", "acao", "recurso", "autor", "de", "ate"] as const;

export const loadAuditParams = createLoader(auditParsers);
export type AuditParams = Awaited<ReturnType<typeof loadAuditParams>>;
