import { STATUS_LABELS } from "@/features/usuarios/labels";
import { iterateParticipants } from "@/features/usuarios/queries";
import { loadParticipantParams } from "@/features/usuarios/search-params";
import { recordAudit } from "@/server/audit/record";
import { requireAdminApi } from "@/server/auth/admin-api";
import { getDb } from "@/server/db";
import { csvResponse } from "@/server/table/csv-export";

/** CSV dos participantes com os filtros da tela (exige `participant.export`). */
export async function GET(request: Request) {
  const auth = await requireAdminApi({ participant: ["export"] });
  if ("response" in auth) return auth.response;
  const db = getDb();

  const params = loadParticipantParams(new URL(request.url).searchParams);
  await recordAudit(
    db,
    { adminId: auth.admin.user.id },
    {
      action: "user.export",
      resourceType: "user",
      metadata: { filtros: { ...params, cursor: undefined, dir: undefined } },
    },
  );

  async function* rows() {
    for await (const row of iterateParticipants(db, params)) {
      yield [
        row.id,
        row.name,
        row.email,
        STATUS_LABELS[row.status].label,
        row.emailVerified ? "sim" : "não",
        row.createdAt,
        row.lastSeenAt,
        row.participations,
      ];
    }
  }

  return csvResponse(
    "participantes",
    [
      "id",
      "nome",
      "email",
      "status",
      "email_verificado",
      "cadastro",
      "ultimo_acesso",
      "participacoes",
    ],
    rows(),
  );
}
