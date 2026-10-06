import "server-only";
import { recordAudit } from "@/server/audit/record";
import { requireAdminApi } from "@/features/auth/server/admin-api";
import type { PermissionRequest } from "@/features/auth/server/permissions";
import { getDb, type Database } from "@/server/db";
import { csvResponse } from "@/server/table/csv-export";

interface CsvExport<TParams extends { cursor: unknown; dir: unknown }, TRow> {
  permission: PermissionRequest;
  /** Registro da exportação no audit log (com os filtros usados). */
  audit: { action: string; resourceType: string };
  /** Nome do arquivo, sem a data e a extensão. */
  filename: string;
  header: string[];
  loadParams: (search: URLSearchParams) => TParams;
  rows: (db: Database, params: TParams) => AsyncIterable<TRow>;
  toCells: (row: TRow) => unknown[];
}

/**
 * GET de uma exportação CSV do painel: autoriza, registra a exportação na
 * auditoria (antes de transmitir) e manda as linhas em stream.
 */
export function csvExportRoute<TParams extends { cursor: unknown; dir: unknown }, TRow>(
  spec: CsvExport<TParams, TRow>,
) {
  return async function GET(request: Request): Promise<Response> {
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
