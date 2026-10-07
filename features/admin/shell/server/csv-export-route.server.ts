import { recordAudit } from "@/server/audit.server";
import { requireAdminApi } from "@/features/auth/server/admin-api.server";
import type { PermissionRequest } from "@/features/auth/server/permissions.server";
import { getDb, type Database } from "@/server/db/index.server";
import { csvResponse } from "@/server/table/csv-export.server";

interface CsvExport<TParams extends { cursor: unknown; dir: unknown }, TRow> {
  permission: PermissionRequest;
  /** Audit log entry for the export (with the filters used). */
  audit: { action: string; resourceType: string };
  /** File name, without the date and the extension. */
  filename: string;
  header: string[];
  loadParams: (search: URLSearchParams) => TParams;
  rows: (db: Database, params: TParams) => AsyncIterable<TRow>;
  toCells: (row: TRow) => unknown[];
}

/**
 * Handler for an admin panel CSV export: authorizes, records the export in the
 * audit log (before streaming) and streams the rows.
 */
export function csvExportRoute<TParams extends { cursor: unknown; dir: unknown }, TRow>(
  spec: CsvExport<TParams, TRow>,
) {
  return async function exportCsv(request: Request): Promise<Response> {
    const auth = await requireAdminApi(spec.permission);
    if ("response" in auth) return auth.response;
    const db = getDb();
    const params = spec.loadParams(new URL(request.url).searchParams);
    await recordAudit(
      db,
      { adminId: auth.admin.user.id },
      {
        ...spec.audit,
        metadata: { filtros: { ...params, cursor: undefined, dir: undefined } },
      },
    );
    async function* cells() {
      for await (const row of spec.rows(db, params)) yield spec.toCells(row);
    }
    return csvResponse(spec.filename, spec.header, cells());
  };
}
