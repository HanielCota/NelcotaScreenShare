import { csvExportRoute } from "@/features/admin/csv-export-route.server";
import { iterateShares } from "@/features/admin/shares/queries.server";
import { loadShareParams } from "@/features/admin/shares/search-params";

/** CSV dos compartilhamentos com os filtros da tela (exige `shareSession.export`). */
export const GET = csvExportRoute({
  permission: { shareSession: ["export"] },
  audit: { action: "share_session.export", resourceType: "share_session" },
  filename: "compartilhamentos",
  header: ["id", "sala", "pessoa", "inicio", "fim", "duracao_segundos", "com_audio"],
  loadParams: loadShareParams,
  rows: iterateShares,
  toCells: (row) => [
    row.id,
    row.roomCode,
    row.person,
    row.startedAt,
    row.endedAt,
    row.durationSeconds,
    row.withAudio ? "sim" : "não",
  ],
});
