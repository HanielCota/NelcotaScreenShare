"use client";

import { Eye } from "lucide-react";
import { createContext, use, useState } from "react";
import type { PageInfo } from "@/components/data-table/page-info";
import { DataTable, type DataTableColumn } from "@/components/data-table/DataTable";
import { Button } from "@/components/ui/button";
import { actionLabel, actorText, resourceLabel } from "@/features/admin/audit/labels";
import type { AuditRow } from "@/features/admin/audit/queries";
import { formatDateTime, formatRelative } from "@/lib/format";
import { AuditDetail } from "./AuditDetail";
import { AuditFilters, type AuditFilterOptions } from "./AuditFilters";

/** Abre o painel de detalhes a partir da célula (as colunas ficam fora do render). */
const OpenDetailContext = createContext<(row: AuditRow) => void>(() => {});

function DetailButton({ row }: { row: AuditRow }) {
  const open = use(OpenDetailContext);
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => open(row)}
      aria-label={`Ver detalhes: ${actionLabel(row.action)}`}
    >
      <Eye aria-hidden="true" />
    </Button>
  );
}

function WhenCell({ row }: { row: AuditRow }) {
  return (
    <time
      dateTime={row.createdAt}
      title={formatDateTime(row.createdAt)}
      className="whitespace-nowrap"
      suppressHydrationWarning
    >
      {formatRelative(row.createdAt)}
    </time>
  );
}

function ResourceCell({ row }: { row: AuditRow }) {
  return (
    <span className="text-ink-muted">
      {resourceLabel(row.resourceType)}
      {row.resourceId ? ` · ${row.resourceId.slice(0, 8)}` : ""}
    </span>
  );
}

const COLUMNS: DataTableColumn<AuditRow>[] = [
  { id: "quando", header: "Quando", cell: ({ row }) => <WhenCell row={row.original} /> },
  { id: "quem", header: "Quem", cell: ({ row }) => actorText(row.original.actor) },
  { id: "acao", header: "Ação", cell: ({ row }) => actionLabel(row.original.action) },
  { id: "recurso", header: "Recurso", cell: ({ row }) => <ResourceCell row={row.original} /> },
  {
    id: "ip",
    header: "IP",
    cell: ({ row }) => <span className="font-mono text-xs">{row.original.ip ?? "—"}</span>,
  },
  { id: "detalhes", header: "Detalhes", cell: ({ row }) => <DetailButton row={row.original} /> },
];

function AuditCard({ row, onOpen }: { row: AuditRow; onOpen: (row: AuditRow) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(row)}
      className="flex w-full flex-col items-start gap-1 text-left"
    >
      <span className="font-semibold">{actionLabel(row.action)}</span>
      <span className="text-sm text-ink-muted">
        {actorText(row.actor)} ·{" "}
        <time dateTime={row.createdAt} suppressHydrationWarning>
          {formatRelative(row.createdAt)}
        </time>
      </span>
      <span className="text-xs text-ink-subtle">
        {resourceLabel(row.resourceType)} · {row.ip ?? "IP desconhecido"}
      </span>
    </button>
  );
}

export function AuditTable({
  rows,
  page,
  options,
  exportHref,
}: {
  rows: AuditRow[];
  page: PageInfo;
  options: AuditFilterOptions;
  exportHref: string | null;
}) {
  const [detail, setDetail] = useState<AuditRow | null>(null);
  const renderCard = (row: AuditRow) => <AuditCard row={row} onOpen={setDetail} />;

  return (
    <OpenDetailContext value={setDetail}>
      <DataTable
        label="Audit log"
        columns={COLUMNS}
        data={rows}
        page={page}
        emptyMessage="Nenhum registro com esses filtros."
        toolbar={<AuditFilters options={options} exportHref={exportHref} />}
        renderCard={renderCard}
      />
      <AuditDetail row={detail} onClose={() => setDetail(null)} />
    </OpenDetailContext>
  );
}
