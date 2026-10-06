import { iterateRooms } from "@/features/salas/queries";
import { loadRoomParams } from "@/features/salas/search-params";
import { recordAudit } from "@/server/audit/record";
import { requireAdminApi } from "@/server/auth/admin-api";
import { getDb } from "@/server/db";
import { csvResponse } from "@/server/table/csv-export";

/** CSV das salas com os filtros da tela (exige `room.export`). */
export async function GET(request: Request) {
  const auth = await requireAdminApi({ room: ["export"] });
  if ("response" in auth) return auth.response;
  const db = getDb();
  if (!db) return new Response("Banco indisponível.", { status: 503 });

  const params = loadRoomParams(new URL(request.url).searchParams);
  await recordAudit(
    db,
    { adminId: auth.admin.user.id },
    {
      action: "room.export",
      resourceType: "room",
      metadata: { filtros: { ...params, cursor: undefined, dir: undefined } },
    },
  );

  async function* rows() {
    for await (const row of iterateRooms(db!, params)) {
      const seconds = row.finishedAt
        ? Math.round((Date.parse(row.finishedAt) - Date.parse(row.startedAt)) / 1000)
        : null;
      yield [
        row.id,
        row.code,
        row.deleted ? "excluída" : row.status === "active" ? "ao vivo" : "encerrada",
        row.startedAt,
        row.finishedAt,
        seconds,
        row.peak,
        row.shares,
      ];
    }
  }

  return csvResponse(
    "salas",
    ["id", "codigo", "status", "inicio", "fim", "duracao_segundos", "pico", "compartilhamentos"],
    rows(),
  );
}
