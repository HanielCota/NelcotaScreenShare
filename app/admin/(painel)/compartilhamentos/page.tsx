import type { Metadata } from "next";
import { createSerializer } from "nuqs/server";
import { SharesTable } from "@/features/compartilhamentos/components/SharesTable";
import { listShares } from "@/features/compartilhamentos/queries";
import { loadShareParams, shareParsers } from "@/features/compartilhamentos/search-params";
import { PAGE_SIZE } from "@/lib/table-params";
import { requireAdmin } from "@/server/auth/admin-session";
import { can } from "@/server/auth/permissions";
import { getDb } from "@/server/db";

export const metadata: Metadata = { title: "Compartilhamentos" };

const serialize = createSerializer(shareParsers);

export default async function SharesPage({ searchParams }: PageProps<"/admin/compartilhamentos">) {
  const admin = await requireAdmin({ shareSession: ["read"] });
  const db = getDb();
  const params = await loadShareParams(searchParams);
  const page = await listShares(db, params, PAGE_SIZE);

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Compartilhamentos</h1>
        <p className="mt-1 text-ink-muted">Cada vez que alguém compartilhou a tela numa sala.</p>
      </div>
      <SharesTable
        rows={page.items}
        page={{
          nextCursor: page.nextCursor,
          prevCursor: page.prevCursor,
          total: page.total,
          capped: page.capped,
        }}
        exportHref={
          can(admin.user.role, { shareSession: ["export"] })
            ? `/api/admin/exportar/compartilhamentos${serialize({ ...params, cursor: null, dir: null })}`
            : null
        }
      />
    </>
  );
}
