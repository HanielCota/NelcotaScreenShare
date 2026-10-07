import { csvExportRoute } from "@/features/admin/csv-export-route";
import { STATUS_LABELS } from "@/features/usuarios/labels";
import { iterateParticipants } from "@/features/usuarios/queries";
import { loadParticipantParams } from "@/features/usuarios/search-params";

/** CSV dos participantes com os filtros da tela (exige `participant.export`). */
export const GET = csvExportRoute({
  permission: { participant: ["export"] },
  // "user.export" é o nome já gravado no audit log (decisão em aberto: Q5).
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
