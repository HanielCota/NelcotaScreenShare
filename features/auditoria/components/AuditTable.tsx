"use client";

import { Download, Eye, X } from "lucide-react";
import { debounce, useQueryStates } from "nuqs";
import { createContext, use, useState, useTransition } from "react";
import {
  DataTable,
  type DataTableColumn,
  type PageInfo,
} from "@/components/admin/data-table/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { actionLabel, resourceLabel } from "@/lib/audit-labels";
import { formatDateTime, formatRelative } from "@/lib/format";
import { resetPage } from "@/lib/table-params";
import { auditParsers } from "../search-params";
import type { AuditRow } from "../queries";

interface Options {
  actions: string[];
  resources: string[];
  admins: { id: string; name: string; email: string }[];
}

function actorText(actor: AuditRow["actor"]): string {
  if (actor.kind === "admin") return actor.name;
  if (actor.kind === "user") return `${actor.name} (participante)`;
  return "Sistema";
}

function value(v: unknown): string {
  if (v === null || v === undefined) return "—";
  return typeof v === "string" ? v : JSON.stringify(v);
}

const SELECT_CLASS = "h-9 rounded-lg border border-input bg-surface-2 px-2.5 text-sm text-ink";

function Filters({ options, exportHref }: { options: Options; exportHref: string | null }) {
  const [pending, startTransition] = useTransition();
  const [params, setParams] = useQueryStates(auditParsers, {
    shallow: false,
    startTransition,
  });
  const set = (
    patch: Partial<Record<"q" | "acao" | "recurso" | "autor" | "de" | "ate", string | null>>,
  ) => void setParams({ ...patch, ...resetPage });
  // Só a busca digitada espera a pessoa parar de digitar.
  const [text, setText] = useState(params.q);
  const search = (q: string) => {
    setText(q);
    void setParams({ q: q || null, ...resetPage }, { limitUrlUpdates: debounce(350) });
  };
  const active = Boolean(
    params.q || params.acao || params.recurso || params.autor || params.de || params.ate,
  );

  return (
    <>
      <div className="flex min-w-48 flex-1 flex-col gap-1.5">
        <Label htmlFor="audit-q" className="text-xs text-ink-subtle">
          request_id ou ID do recurso
        </Label>
        <Input
          id="audit-q"
          value={text}
          placeholder="Cole um ID"
          className="h-9"
          onChange={(event) => search(event.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="audit-acao" className="text-xs text-ink-subtle">
          Ação
        </Label>
        <select
          id="audit-acao"
          className={SELECT_CLASS}
          value={params.acao ?? ""}
          onChange={(event) => set({ acao: event.target.value || null })}
        >
          <option value="">Todas</option>
          {options.actions.map((action) => (
            <option key={action} value={action}>
              {actionLabel(action)}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="audit-autor" className="text-xs text-ink-subtle">
          Admin
        </Label>
        <select
          id="audit-autor"
          className={SELECT_CLASS}
          value={params.autor ?? ""}
          onChange={(event) => set({ autor: event.target.value || null })}
        >
          <option value="">Todos</option>
          {options.admins.map((admin) => (
            <option key={admin.id} value={admin.id}>
              {admin.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="audit-recurso" className="text-xs text-ink-subtle">
          Recurso
        </Label>
        <select
          id="audit-recurso"
          className={SELECT_CLASS}
          value={params.recurso ?? ""}
          onChange={(event) => set({ recurso: event.target.value || null })}
        >
          <option value="">Todos</option>
          {options.resources.map((resource) => (
            <option key={resource} value={resource}>
              {resourceLabel(resource)}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="audit-de" className="text-xs text-ink-subtle">
          De
        </Label>
        <Input
          id="audit-de"
          type="date"
          className="h-9"
          value={params.de ?? ""}
          onChange={(event) => set({ de: event.target.value || null })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="audit-ate" className="text-xs text-ink-subtle">
          Até
        </Label>
        <Input
          id="audit-ate"
          type="date"
          className="h-9"
          value={params.ate ?? ""}
          onChange={(event) => set({ ate: event.target.value || null })}
        />
      </div>
      <span className="flex gap-2">
        {active ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-9"
            disabled={pending}
            onClick={() => {
              setText("");
              set({ q: null, acao: null, recurso: null, autor: null, de: null, ate: null });
            }}
          >
            <X aria-hidden="true" />
            Limpar
          </Button>
        ) : null}
        {exportHref ? (
          <Button asChild variant="outline" size="sm" className="h-9">
            <a href={exportHref} download>
              <Download aria-hidden="true" />
              Exportar CSV
            </a>
          </Button>
        ) : null}
      </span>
    </>
  );
}

function AuditDetail({ row, onClose }: { row: AuditRow | null; onClose: () => void }) {
  return (
    <Sheet open={row !== null} onOpenChange={(open) => (open ? null : onClose())}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {row ? (
          <>
            <SheetHeader>
              <SheetTitle>{actionLabel(row.action)}</SheetTitle>
              <SheetDescription>
                {formatDateTime(row.createdAt)} · {actorText(row.actor)}
              </SheetDescription>
            </SheetHeader>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 px-4 text-sm">
              <dt className="text-ink-subtle">Ação</dt>
              <dd className="font-mono text-xs break-all">{row.action}</dd>
              <dt className="text-ink-subtle">Recurso</dt>
              <dd className="break-all">
                {resourceLabel(row.resourceType)}{" "}
                {row.resourceId ? (
                  <code className="font-mono text-xs">{row.resourceId}</code>
                ) : null}
              </dd>
              {row.actor.kind === "admin" ? (
                <>
                  <dt className="text-ink-subtle">E-mail</dt>
                  <dd className="break-all">{row.actor.email}</dd>
                </>
              ) : null}
              <dt className="text-ink-subtle">IP</dt>
              <dd>{row.ip ?? "—"}</dd>
              <dt className="text-ink-subtle">Navegador</dt>
              <dd className="text-xs break-all text-ink-muted">{row.userAgent ?? "—"}</dd>
              <dt className="text-ink-subtle">request_id</dt>
              <dd className="font-mono text-xs break-all">{row.requestId ?? "—"}</dd>
            </dl>
            {row.changes ? (
              <div className="px-4">
                <h3 className="mb-2 text-sm font-semibold">Antes → depois</h3>
                <table className="w-full text-left text-sm">
                  <thead className="text-xs text-ink-subtle">
                    <tr>
                      <th className="py-1 pr-3 font-medium">Campo</th>
                      <th className="py-1 pr-3 font-medium">Antes</th>
                      <th className="py-1 font-medium">Depois</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(row.changes).map(([field, change]) => (
                      <tr key={field} className="border-t border-line align-top">
                        <td className="py-1.5 pr-3 font-mono text-xs">{field}</td>
                        <td className="py-1.5 pr-3 text-danger">{value(change.antes)}</td>
                        <td className="py-1.5 text-brand-soft">{value(change.depois)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
            {Object.keys(row.metadata).length > 0 ? (
              <div className="px-4 pb-6">
                <h3 className="mb-2 text-sm font-semibold">Detalhes</h3>
                <pre className="overflow-x-auto rounded-xl bg-surface-2 p-3 text-xs">
                  {JSON.stringify(row.metadata, null, 2)}
                </pre>
              </div>
            ) : null}
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

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
  options: Options;
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
        toolbar={<Filters options={options} exportHref={exportHref} />}
        renderCard={renderCard}
      />
      <AuditDetail row={detail} onClose={() => setDetail(null)} />
    </OpenDetailContext>
  );
}
