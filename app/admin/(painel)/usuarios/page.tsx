import type { Metadata } from "next";
import { pageInfo } from "@/components/data-table/page-info";
import { createSerializer } from "nuqs/server";
import { ParticipantsTable } from "@/features/admin/participants/ui/ParticipantsTable";
import { listParticipants } from "@/features/admin/participants/queries";
import {
  loadParticipantParams,
  participantParsers,
} from "@/features/admin/participants/search-params";
import { PAGE_SIZE } from "@/lib/table-params";
import { requireAdmin } from "@/features/auth/server/admin-session";
import { can } from "@/features/auth/server/permissions";
import { getDb } from "@/server/db";

export const metadata: Metadata = { title: "Participantes" };

const serialize = createSerializer(participantParsers);

export default async function ParticipantsPage({ searchParams }: PageProps<"/admin/usuarios">) {
  const admin = await requireAdmin({ participant: ["read"] });
  const db = getDb();
  const params = await loadParticipantParams(searchParams);
  const page = await listParticipants(db, params, PAGE_SIZE);
  const role = admin.user.role;

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Participantes</h1>
        <p className="mt-1 text-ink-muted">
          Contas de quem entra nas salas. O painel nunca vê nem define a senha de ninguém.
        </p>
      </div>
      <ParticipantsTable
        rows={page.items}
        page={pageInfo(page)}
        can={{
          update: can(role, { participant: ["update"] }),
          delete: can(role, { participant: ["delete"] }),
        }}
        exportHref={
          can(role, { participant: ["export"] })
            ? `/api/admin/exportar/usuarios${serialize({ ...params, cursor: null, dir: null })}`
            : null
        }
      />
    </>
  );
}
