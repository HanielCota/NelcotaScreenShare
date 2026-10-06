"use client";

import { Download, X } from "lucide-react";
import Link from "next/link";
import { debounce, useQueryStates } from "nuqs";
import {
  DataTable,
  useTableTransition,
  type DataTableColumn,
  type PageInfo,
} from "@/components/admin/data-table/DataTable";
import {
  FilterDate,
  FilterSearch,
  FilterSelect,
  SortDirection,
} from "@/components/admin/data-table/filters";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatDuration } from "@/lib/format";
import { resetPage } from "@/lib/table-params";
import type { ShareRow } from "../queries";
import { shareParsers } from "../search-params";

const AUDIO_OPTIONS = [
  { value: "com", label: "Com áudio" },
  { value: "sem", label: "Sem áudio" },
] as const;

const STATUS_OPTIONS = [
  { value: "andamento", label: "Em andamento" },
  { value: "finalizados", label: "Finalizados" },
] as const;

function Filters({ exportHref }: { exportHref: string | null }) {
  const startTransition = useTableTransition();
  const [params, setParams] = useQueryStates(shareParsers, { shallow: false, startTransition });
  const active = Boolean(
    params.sala || params.audio || params.situacao || params.min || params.de || params.ate,
  );
  return (
    <>
      <FilterSearch
        label="Sala"
        placeholder="Código da sala"
        value={params.sala}
        onChange={(sala) =>
          void setParams({ sala: sala || null, ...resetPage }, { limitUrlUpdates: debounce(350) })
        }
      />
      <FilterSelect
        label="Situação"
        value={params.situacao}
        options={STATUS_OPTIONS}
        allLabel="Todos"
        onChange={(situacao) => void setParams({ situacao, ...resetPage })}
      />
      <FilterSelect
        label="Áudio"
        value={params.audio}
        options={AUDIO_OPTIONS}
        allLabel="Com ou sem"
        onChange={(audio) => void setParams({ audio, ...resetPage })}
      />
      <FilterSearch
        label="Mín. (minutos)"
        type="number"
        value={params.min === null ? "" : String(params.min)}
        onChange={(value) => {
          const minutes = Number.parseInt(value, 10);
          void setParams(
            { min: Number.isFinite(minutes) && minutes > 0 ? minutes : null, ...resetPage },
            { limitUrlUpdates: debounce(350) },
          );
        }}
      />
      <FilterDate
        label="Início de"
        value={params.de}
        onChange={(de) => void setParams({ de, ...resetPage })}
      />
      <FilterDate
        label="até"
        value={params.ate}
        onChange={(ate) => void setParams({ ate, ...resetPage })}
      />
      <SortDirection
        value={params.ordem}
        onChange={(ordem) => void setParams({ ordem, ...resetPage })}
      />
      <span className="flex gap-2">
        {active ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-9"
            onClick={() =>
              void setParams({
                sala: null,
                audio: null,
                situacao: null,
                min: null,
                de: null,
                ate: null,
                ...resetPage,
              })
            }
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

function Duration({ row }: { row: ShareRow }) {
  if (row.endedAt === null) return <StatusBadge tone="live">Em andamento</StatusBadge>;
  return <span className="whitespace-nowrap">{formatDuration(row.durationSeconds ?? 0)}</span>;
}

function Person({ row }: { row: ShareRow }) {
  return row.userId ? (
    <Link href={`/admin/usuarios/${row.userId}`} className="hover:underline">
      {row.person}
    </Link>
  ) : (
    <span>{row.person}</span>
  );
}

function Room({ row }: { row: ShareRow }) {
  return (
    <Link href={`/admin/salas/${row.roomId}`} className="font-mono text-sm hover:underline">
      {row.roomCode}
    </Link>
  );
}

const COLUMNS: DataTableColumn<ShareRow>[] = [
  { id: "sala", header: "Sala", cell: ({ row }) => <Room row={row.original} /> },
  { id: "pessoa", header: "Pessoa", cell: ({ row }) => <Person row={row.original} /> },
  {
    id: "inicio",
    header: "Início",
    cell: ({ row }) => (
      <span className="whitespace-nowrap">{formatDateTime(row.original.startedAt)}</span>
    ),
  },
  { id: "duracao", header: "Duração", cell: ({ row }) => <Duration row={row.original} /> },
  {
    id: "audio",
    header: "Áudio",
    cell: ({ row }) => (row.original.withAudio ? "Com áudio" : "—"),
  },
];

function renderCard(row: ShareRow) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="flex flex-col gap-1">
        <Person row={row} />
        <span className="text-xs text-ink-muted">
          <Room row={row} /> · {formatDateTime(row.startedAt)}
          {row.withAudio ? " · com áudio" : ""}
        </span>
      </span>
      <Duration row={row} />
    </div>
  );
}

export function SharesTable({
  rows,
  page,
  exportHref,
}: {
  rows: ShareRow[];
  page: PageInfo;
  exportHref: string | null;
}) {
  return (
    <DataTable
      label="Compartilhamentos"
      columns={COLUMNS}
      data={rows}
      page={page}
      emptyMessage="Nenhum compartilhamento com esses filtros."
      toolbar={<Filters exportHref={exportHref} />}
      renderCard={renderCard}
    />
  );
}
