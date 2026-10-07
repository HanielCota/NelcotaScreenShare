import type { Metadata } from "next";
import { pageInfo } from "@/components/data-table/page-info";
import { createSerializer } from "nuqs/server";
import { SharesTable } from "@/features/admin/shares/ui/SharesTable";
import { listShares } from "@/features/admin/shares/queries";
import { loadShareParams, shareParsers } from "@/features/admin/shares/search-params";
import { PAGE_SIZE } from "@/lib/table-params";
import { requireAdmin } from "@/features/auth/server/admin-session";
import { can } from "@/features/auth/server/permissions";
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
        page={pageInfo(page)}
        exportHref={
          can(admin.user.role, { shareSession: ["export"] })
            ? `/api/admin/exportar/compartilhamentos${serialize({ ...params, cursor: null, dir: null })}`
            : null
        }
      />
    </>
  );
}
