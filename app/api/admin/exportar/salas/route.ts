import { csvExportRoute } from "@/features/admin/csv-export-route";
import { iterateRooms } from "@/features/salas/queries";
import { loadRoomParams } from "@/features/salas/search-params";

/** CSV das salas com os filtros da tela (exige `room.export`). */
export const GET = csvExportRoute({
  permission: { room: ["export"] },
  audit: { action: "room.export", resourceType: "room" },
  filename: "salas",
  header: [
    "id",
    "codigo",
    "status",
    "inicio",
    "fim",
    "duracao_segundos",
    "pico",
    "compartilhamentos",
  ],
  loadParams: loadRoomParams,
  rows: iterateRooms,
  toCells: (row) => [
    row.id,
    row.code,
    row.deleted ? "excluída" : row.status === "active" ? "ao vivo" : "encerrada",
    row.startedAt,
    row.finishedAt,
    row.finishedAt
      ? Math.round((Date.parse(row.finishedAt) - Date.parse(row.startedAt)) / 1000)
      : null,
    row.peak,
    row.shares,
  ],
});
