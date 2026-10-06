import { iterateAuditLogs } from "@/features/auditoria/queries";
import { loadAuditParams } from "@/features/auditoria/search-params";
import { actionLabel, resourceLabel } from "@/lib/audit-labels";
import { CSV_BOM, csvRow } from "@/lib/csv";
import { recordAudit } from "@/server/audit/record";
import { getAdminSession, needsTwoFactorSetup } from "@/server/auth/admin-session";
import { can } from "@/server/auth/permissions";
import { getDb } from "@/server/db";
import { logger } from "@/server/logger";

/**
 * CSV do audit log com os filtros da tela, em stream (lotes keyset de 1.000).
 * Mesma autorização de uma action: sessão, 2FA e `audit.export`. A própria
 * exportação fica registrada no audit log.
 */
export async function GET(request: Request) {
  const admin = await getAdminSession();
  if (!admin || needsTwoFactorSetup(admin))
    return new Response("Sessão inválida.", { status: 401 });
  if (!can(admin.user.role, { audit: ["export"] }))
    return new Response("Sem permissão.", { status: 403 });
  const db = getDb();
  if (!db) return new Response("Banco indisponível.", { status: 503 });

  const params = loadAuditParams(new URL(request.url).searchParams);
  await recordAudit(
    db,
    { adminId: admin.user.id },
    {
      action: "audit.export",
      resourceType: "audit_logs",
      metadata: { filtros: { ...params, cursor: undefined, dir: undefined } },
    },
  );

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        controller.enqueue(encoder.encode(CSV_BOM));
        controller.enqueue(
          encoder.encode(
            csvRow([
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
            ]),
          ),
        );
        for await (const row of iterateAuditLogs(db, params)) {
          controller.enqueue(
            encoder.encode(
              csvRow([
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
              ]),
            ),
          );
        }
        controller.close();
      } catch (error) {
        logger.error({ err: error }, "falha ao exportar o audit log");
        controller.error(error);
      }
    },
  });

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="auditoria-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
