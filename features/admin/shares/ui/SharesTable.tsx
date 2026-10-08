import { Link } from "react-router";
import { debounce, useQueryStates } from "nuqs";
import type { PageInfo } from "@/components/data-table/page-info";
import {
  DataTable,
  useTableTransition,
  type DataTableColumn,
} from "@/components/data-table/DataTable";
import {
  FilterActions,
  FilterDate,
  FilterSearch,
  FilterSelect,
  SortDirection,
} from "@/components/data-table/filters";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDateTime, formatDuration } from "@/lib/format";
import { filterState, resetPage } from "@/lib/table-params";
import type { ShareRow } from "@/features/admin/shares/server/queries.server";
import { SHARE_FILTERS, shareParsers } from "@/features/admin/shares/domain/search-params";

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
  const filters = filterState(SHARE_FILTERS, params);
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
      <FilterActions
        active={filters.active}
        exportHref={exportHref}
        onClear={() => void setParams({ ...filters.cleared, ...resetPage })}
      />
    </>
  );
}

function Duration({ row }: { row: ShareRow }) {
  if (row.endedAt === null) return <StatusBadge tone="live">Em andamento</StatusBadge>;
  return <span className="whitespace-nowrap">{formatDuration(row.durationSeconds ?? 0)}</span>;
}

function Person({ row }: { row: ShareRow }) {
  return row.userId ? (
    <Link viewTransition to={`/admin/usuarios/${row.userId}`} className="hover:underline">
      {row.person}
    </Link>
  ) : (
    <span>{row.person}</span>
  );
}

function Room({ row }: { row: ShareRow }) {
  return (
    <Link
      viewTransition
      to={`/admin/salas/${row.roomId}`}
      className="font-sans text-sm tabular-nums hover:underline"
    >
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
