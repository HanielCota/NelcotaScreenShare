import { csvExportRoute } from "@/features/admin/shell/server/csv-export-route.server";
import { iterateAuditLogs } from "@/features/admin/audit/server/queries.server";
import { loadAuditParams } from "@/features/admin/audit/domain/search-params";
import { actionLabel, resourceLabel } from "@/features/admin/audit/domain/labels";

/**
 * CSV do audit log com os filtros da tela, em stream (lotes keyset de 1.000).
 * Exige `audit.export`; a própria exportação fica registrada no audit log.
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
