import { csvExportRoute } from "@/features/admin/shell/server/csv-export-route.server";
import { iterateAuditLogs } from "@/features/admin/audit/server/queries.server";
import { loadAuditParams } from "@/features/admin/audit/domain/search-params";
import { actionLabel, resourceLabel } from "@/features/admin/audit/domain/labels";

/**
 * Audit log CSV with the screen filters, streamed (keyset batches of 1,000).
 * Requires `audit.export`; the export itself is recorded in the audit log.
 */
export const exportCsv = csvExportRoute({
  permission: { audit: ["export"] },
  audit: { action: "audit.export", resourceType: "audit_logs" },
  filename: "auditoria",
  header: [
    "quando",
    "acao",
    "descricao",
    "autor",
    "email_autor",
    "recurso",
    "id_recurso",
    "ip",
    "request_id",
    "mudancas",
  ],
  loadParams: loadAuditParams,
  rows: iterateAuditLogs,
  toCells: (row) => [
    row.createdAt,
    row.action,
    actionLabel(row.action),
    row.actor.kind === "system" ? "Sistema" : row.actor.name,
    row.actor.kind === "admin" ? row.actor.email : "",
    resourceLabel(row.resourceType),
    row.resourceId,
    row.ip,
    row.requestId,
    row.changes,
  ],
});
