import type { Metadata } from "next";
import { pageInfo } from "@/components/data-table/page-info";
import { createSerializer } from "nuqs/server";
import { AuditTable } from "@/features/admin/audit/ui/AuditTable";
import { auditFilterOptions, listAuditLogs } from "@/features/admin/audit/queries";
import { auditParsers, loadAuditParams } from "@/features/admin/audit/search-params";
import { PAGE_SIZE } from "@/lib/table-params";
import { requireAdmin } from "@/features/auth/server/admin-session";
import { can } from "@/features/auth/server/permissions";
import { getDb } from "@/server/db";

export const metadata: Metadata = { title: "Auditoria" };

const serialize = createSerializer(auditParsers);

export default async function AuditPage({ searchParams }: PageProps<"/admin/auditoria">) {
  const admin = await requireAdmin({ audit: ["read"] });
  const db = getDb();
  const params = await loadAuditParams(searchParams);
  const [page, options] = await Promise.all([
    listAuditLogs(db, params, PAGE_SIZE),
    auditFilterOptions(db),
  ]);
  // Exporta exatamente o filtro da tela (sem a página atual).
  const exportHref = can(admin.user.role, { audit: ["export"] })
    ? `/api/admin/exportar/auditoria${serialize({ ...params, cursor: null, dir: null })}`
    : null;

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Auditoria</h1>
        <p className="mt-1 text-ink-muted">
          Quem fez o quê, quando e de onde. Os registros não podem ser alterados nem apagados.
        </p>
      </div>
      <AuditTable
        rows={page.items}
        page={pageInfo(page)}
        options={options}
        exportHref={exportHref}
      />
    </>
  );
}
