import { iterateShares } from "@/features/compartilhamentos/queries";
import { loadShareParams } from "@/features/compartilhamentos/search-params";
import { recordAudit } from "@/server/audit/record";
import { requireAdminApi } from "@/server/auth/admin-api";
import { getDb } from "@/server/db";
import { csvResponse } from "@/server/table/csv-export";

/** CSV dos compartilhamentos com os filtros da tela (exige `shareSession.export`). */
export async function GET(request: Request) {
  const auth = await requireAdminApi({ shareSession: ["export"] });
  if ("response" in auth) return auth.response;
  const db = getDb();

  const params = loadShareParams(new URL(request.url).searchParams);
  await recordAudit(
    db,
    { adminId: auth.admin.user.id },
    {
      action: "share_session.export",
      resourceType: "share_session",
      metadata: { filtros: { ...params, cursor: undefined, dir: undefined } },
    },
  );

  async function* rows() {
    for await (const row of iterateShares(db, params)) {
      yield [
        row.id,
        row.roomCode,
        row.person,
        row.startedAt,
        row.endedAt,
        row.durationSeconds,
        row.withAudio ? "sim" : "não",
      ];
    }
  }

  return csvResponse(
    "compartilhamentos",
    ["id", "sala", "pessoa", "inicio", "fim", "duracao_segundos", "com_audio"],
    rows(),
  );
}
