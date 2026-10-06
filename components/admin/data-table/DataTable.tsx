"use client";

import {
  rowSelectionFeature,
  tableFeatures,
  useTable,
  type CellContext,
  type ColumnDef,
  type HeaderContext,
  type RowData,
  type RowSelectionState,
} from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import { useQueryStates } from "nuqs";
import {
  createContext,
  use,
  useState,
  useTransition,
  type ReactNode,
  type TransitionStartFunction,
} from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatNumber } from "@/lib/format";
import { useSearchParams } from "next/navigation";
import { filterQuery, pageParsers, type BulkSelection } from "@/lib/table-params";
import { cn } from "@/lib/utils";

/** Ordenação, filtros e paginação são do servidor: a tabela só exibe e seleciona. */
export const dataTableFeatures = tableFeatures({ rowSelectionFeature });
export type DataTableFeatures = typeof dataTableFeatures;
export type DataTableColumn<TData extends RowData> = ColumnDef<DataTableFeatures, TData>;

export interface PageInfo {
  nextCursor: string | null;
  prevCursor: string | null;
  total: number;
  /** O total passou do limite de contagem ("mais de 10.000"). */
  capped: boolean;
}

interface DataTableProps<TData extends RowData & { id: string }> {
  /** Rótulo da tabela para leitores de tela. */
  label: string;
  columns: DataTableColumn<TData>[];
  data: TData[];
  page: PageInfo;
  emptyMessage: string;
  /** Filtros e busca (componentes que usam os mesmos parâmetros de URL). */
  toolbar?: ReactNode;
  /**
   * Ações em massa para a seleção (IDs da página ou todos os resultados do
   * filtro); sem isso, não há seleção. `count` é o total aproximado.
   */
  bulkActions?: (selection: BulkSelection, clear: () => void, count: number) => ReactNode;
  /** Cartão por linha abaixo de 640 px (tabelas largas viram lista). */
  renderCard?: (row: TData) => ReactNode;
}

/** Caixa "selecionar todos desta página" (componente fora do render). */
function SelectAllHeader<TData extends RowData>({
  table,
}: HeaderContext<DataTableFeatures, TData>) {
  return (
    <Checkbox
      checked={
        table.getIsAllPageRowsSelected()
          ? true
          : table.getIsSomePageRowsSelected()
            ? "indeterminate"
            : false
      }
      onCheckedChange={(value) => table.toggleAllPageRowsSelected(value === true)}
      aria-label="Selecionar todos desta página"
    />
  );
}

function SelectRowCell<TData extends RowData>({ row }: CellContext<DataTableFeatures, TData>) {
  return (
    <Checkbox
      checked={row.getIsSelected()}
      onCheckedChange={(value) => row.toggleSelected(value === true)}
      aria-label="Selecionar linha"
    />
  );
}

/**
 * Transição da tabela para a barra de filtros: filtro mudou → a tabela fica
 * "carregando" (aria-busy, esmaecida) até os dados novos chegarem.
 */
const TableTransitionContext = createContext<TransitionStartFunction | null>(null);

export function useTableTransition(): TransitionStartFunction {
  const startTransition = use(TableTransitionContext);
  if (!startTransition) throw new Error("useTableTransition fora de um DataTable");
  return startTransition;
}

function totalLabel({ total, capped }: PageInfo): string {
  if (capped) return `Mais de ${formatNumber(total)} resultados`;
  return total === 1 ? "1 resultado" : `${formatNumber(total)} resultados`;
}

export function DataTable<TData extends RowData & { id: string }>({
  label,
  columns,
  data,
  page,
  emptyMessage,
  toolbar,
  bulkActions,
  renderCard,
}: DataTableProps<TData>) {
  "use no memo";
  const [pending, startTransition] = useTransition();
  const [, setPage] = useQueryStates(pageParsers, {
    shallow: false,
    startTransition,
    scroll: true,
  });
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const selectable = bulkActions !== undefined;

  const selectColumn: DataTableColumn<TData> = {
    id: "select",
    header: SelectAllHeader,
    cell: SelectRowCell,
  };

  const table = useTable({
    features: dataTableFeatures,
    data,
    columns: selectable ? [selectColumn, ...columns] : columns,
    getRowId: (row) => row.id,
    enableRowSelection: selectable,
    onRowSelectionChange: setRowSelection,
    state: { rowSelection },
  });

  // Só conta o que está na página atual (mudar o filtro "solta" o resto).
  const pageIds = new Set(data.map((row) => row.id));
  const selected = Object.keys(rowSelection).filter((id) => rowSelection[id] && pageIds.has(id));
  // "Todos os resultados" vale só para o filtro em que foi escolhido.
  const filterKey = filterQuery(useSearchParams().toString());
  const [allFor, setAllFor] = useState<string | null>(null);
  const allMatching = allFor === filterKey && selected.length === data.length;
  const selection: BulkSelection = allMatching
    ? { tipo: "filtro", busca: filterKey }
    : { tipo: "ids", ids: selected };
  const count = allMatching ? page.total : selected.length;
  const clear = () => {
    setRowSelection({});
    setAllFor(null);
  };
  const go = (cursor: string | null, dir: "next" | "prev") => {
    clear();
    void setPage({ cursor, dir });
  };

  return (
    <section aria-label={label} className="flex flex-col gap-3">
      {toolbar ? (
        <TableTransitionContext value={startTransition}>
          <div className="flex flex-wrap items-end gap-2">{toolbar}</div>
        </TableTransitionContext>
      ) : null}

      {selectable && selected.length > 0 ? (
        <div className="glass flex flex-wrap items-center gap-3 rounded-xl px-4 py-2.5 text-sm">
          <span className="font-semibold">
            {allMatching
              ? `Todos os ${formatNumber(page.total)} resultados`
              : selected.length === 1
                ? "1 selecionado"
                : `${selected.length} selecionados`}
          </span>
          {!allMatching && selected.length === data.length && page.total > data.length ? (
            // Acima do limite o servidor sempre recusa a ação em massa (server/table/selection.ts).
            page.capped ? (
              <span className="text-ink-muted">
                Mais de {formatNumber(page.total)} resultados: refine o filtro para agir em todos.
              </span>
            ) : (
              <Button variant="link" size="sm" onClick={() => setAllFor(filterKey)}>
                Selecionar todos os {formatNumber(page.total)} resultados
              </Button>
            )
          ) : null}
          {bulkActions(selection, clear, count)}
          <Button variant="ghost" size="sm" className="ml-auto" onClick={clear}>
            Limpar seleção
          </Button>
        </div>
      ) : null}

      <div
        aria-busy={pending}
        className={cn(
          "glass overflow-hidden rounded-2xl transition-opacity",
          pending && "pointer-events-none opacity-60",
        )}
      >
        {data.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-16 text-center text-ink-muted">
            <Inbox className="size-8 text-ink-subtle" aria-hidden="true" />
            <p>{emptyMessage}</p>
          </div>
        ) : (
          <>
            {/* Desktop/tablet: tabela com rolagem horizontal se precisar. */}
            <div className={cn("overflow-x-auto", renderCard && "max-sm:hidden")}>
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((group) => (
                    <TableRow key={group.id}>
                      {group.headers.map((header) => (
                        <TableHead key={header.id} className="whitespace-nowrap">
                          {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() ? "selected" : undefined}
                    >
                      {row.getAllCells().map((cell) => (
                        <TableCell key={cell.id}>
                          <table.FlexRender cell={cell} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {/* Celular: um cartão por linha. */}
            {renderCard ? (
              <ul className="flex flex-col divide-y divide-line sm:hidden">
                {data.map((row) => (
                  <li key={row.id} className="p-4">
                    {renderCard(row)}
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        )}
      </div>

      <nav aria-label="Paginação" className="flex items-center justify-between gap-3 text-sm">
        <span className="text-ink-muted">{totalLabel(page)}</span>
        <span className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!page.prevCursor || pending}
            onClick={() => go(page.prevCursor, "prev")}
          >
            <ChevronLeft aria-hidden="true" />
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!page.nextCursor || pending}
            onClick={() => go(page.nextCursor, "next")}
          >
            Próxima
            <ChevronRight aria-hidden="true" />
          </Button>
        </span>
      </nav>
    </section>
  );
}
