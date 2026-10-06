import type { Metadata } from "next";
import { createSerializer } from "nuqs/server";
import { ParticipantsTable } from "@/features/usuarios/components/ParticipantsTable";
import { listParticipants } from "@/features/usuarios/queries";
import { loadParticipantParams, participantParsers } from "@/features/usuarios/search-params";
import { PAGE_SIZE } from "@/lib/table-params";
import { requireAdmin } from "@/server/auth/admin-session";
import { can } from "@/server/auth/permissions";
import { getDb } from "@/server/db";

export const metadata: Metadata = { title: "Participantes" };

const serialize = createSerializer(participantParsers);

export default async function ParticipantsPage({ searchParams }: PageProps<"/admin/usuarios">) {
  const admin = await requireAdmin({ participant: ["read"] });
  const db = getDb();
  if (!db) throw new Error("Banco indisponível");
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
        page={{
          nextCursor: page.nextCursor,
          prevCursor: page.prevCursor,
          total: page.total,
          capped: page.capped,
        }}
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
