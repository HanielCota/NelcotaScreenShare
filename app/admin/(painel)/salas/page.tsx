import type { Metadata } from "next";
import { pageInfo } from "@/components/data-table/page-info";
import { createSerializer } from "nuqs/server";
import { RoomsTable } from "@/features/admin/rooms/ui/RoomsTable";
import { listRooms } from "@/features/admin/rooms/queries";
import { loadRoomParams, roomParsers } from "@/features/admin/rooms/search-params";
import { PAGE_SIZE } from "@/lib/table-params";
import { requireAdmin } from "@/features/auth/server/admin-session";
import { can } from "@/features/auth/server/permissions";
import { getDb } from "@/server/db";

export const metadata: Metadata = { title: "Salas" };

const serialize = createSerializer(roomParsers);

export default async function RoomsPage({ searchParams }: PageProps<"/admin/salas">) {
  const admin = await requireAdmin({ room: ["read"] });
  const db = getDb();
  const params = await loadRoomParams(searchParams);
  const page = await listRooms(db, params, PAGE_SIZE);
  const role = admin.user.role;

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Salas</h1>
        <p className="mt-1 text-ink-muted">
          Toda sala aberta no LiveKit, com quem entrou e o que foi compartilhado.
        </p>
      </div>
      <RoomsTable
        rows={page.items}
        page={pageInfo(page)}
        canDelete={can(role, { room: ["delete"] })}
        exportHref={
          can(role, { room: ["export"] })
            ? `/api/admin/exportar/salas${serialize({ ...params, cursor: null, dir: null })}`
            : null
        }
      />
    </>
  );
}
