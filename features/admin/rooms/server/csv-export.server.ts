import { csvExportRoute } from "@/features/admin/shell/server/csv-export-route.server";
import { iterateRooms } from "@/features/admin/rooms/server/queries.server";
import { loadRoomParams } from "@/features/admin/rooms/domain/search-params";
import { roomStatus, STATUS_LABELS } from "@/features/admin/rooms/domain/labels";

/** Rooms CSV with the screen filters (requires `room.export`). */
export const exportCsv = csvExportRoute({
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
    STATUS_LABELS[roomStatus(row)].label.toLowerCase(),
    row.startedAt,
    row.finishedAt,
    row.finishedAt
      ? Math.round((Date.parse(row.finishedAt) - Date.parse(row.startedAt)) / 1000)
      : null,
    row.peak,
    row.shares,
  ],
});
