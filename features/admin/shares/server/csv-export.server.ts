import { csvExportRoute } from "@/features/admin/shell/server/csv-export-route.server";
import { iterateShares } from "@/features/admin/shares/server/queries.server";
import { loadShareParams } from "@/features/admin/shares/domain/search-params";

/** Screen shares CSV with the screen filters (requires `shareSession.export`). */
export const exportCsv = csvExportRoute({
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
