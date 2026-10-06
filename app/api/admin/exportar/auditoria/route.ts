import { iterateAuditLogs } from "@/features/auditoria/queries";
import { loadAuditParams } from "@/features/auditoria/search-params";
import { actionLabel, resourceLabel } from "@/lib/audit-labels";
import { recordAudit } from "@/server/audit/record";
import { requireAdminApi } from "@/server/auth/admin-api";
import { getDb } from "@/server/db";
import { csvResponse } from "@/server/table/csv-export";

/**
 * CSV do audit log com os filtros da tela, em stream (lotes keyset de 1.000).
 * Exige `audit.export`; a própria exportação fica registrada no audit log.
 */
export async function GET(request: Request) {
  const auth = await requireAdminApi({ audit: ["export"] });
  if ("response" in auth) return auth.response;
  const db = getDb();
  if (!db) return new Response("Banco indisponível.", { status: 503 });

  const params = loadAuditParams(new URL(request.url).searchParams);
  await recordAudit(
    db,
    { adminId: auth.admin.user.id },
    {
      action: "audit.export",
      resourceType: "audit_logs",
      metadata: { filtros: { ...params, cursor: undefined, dir: undefined } },
    },
  );

  async function* rows() {
    for await (const row of iterateAuditLogs(db!, params)) {
      yield [
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
      ];
    }
  }

  return csvResponse(
    "auditoria",
    [
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
    rows(),
  );
}
