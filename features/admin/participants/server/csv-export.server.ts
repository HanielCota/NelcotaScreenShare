import { csvExportRoute } from "@/features/admin/shell/server/csv-export-route.server";
import { STATUS_LABELS } from "@/features/admin/participants/domain/labels";
import { iterateParticipants } from "@/features/admin/participants/server/queries.server";
import { loadParticipantParams } from "@/features/admin/participants/domain/search-params";

/** Participants CSV with the screen filters (requires `participant.export`). */
export const exportCsv = csvExportRoute({
  permission: { participant: ["export"] },
  // "user.export" is the name already stored in the audit log (open decision: Q5).
  audit: { action: "user.export", resourceType: "user" },
  filename: "participantes",
  header: [
    "id",
    "nome",
    "email",
    "status",
    "email_verificado",
    "cadastro",
    "ultimo_acesso",
    "participacoes",
  ],
  loadParams: loadParticipantParams,
  rows: iterateParticipants,
  toCells: (row) => [
    row.id,
    row.name,
    row.email,
    STATUS_LABELS[row.status].label,
    row.emailVerified ? "sim" : "não",
    row.createdAt,
    row.lastSeenAt,
    row.participations,
  ],
});
