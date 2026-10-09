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
import { useSearchParams } from "react-router";
import { formatNumber } from "@/lib/format";
import { filterQuery, pageParsers, type BulkSelection } from "@/lib/table-params";
import { cn } from "@/lib/utils";
import type { PageInfo } from "./page-info";
import { runAndReport } from "@/lib/telemetry.client";

const dataTableFeatures = tableFeatures({ rowSelectionFeature });
type DataTableFeatures = typeof dataTableFeatures;
export type DataTableColumn<TData extends RowData> = ColumnDef<DataTableFeatures, TData>;

interface DataTableProps<TData extends RowData & { id: string }> {
  /** Table label for screen readers. */
  label: string;
  columns: DataTableColumn<TData>[];
  data: TData[];
  page: PageInfo;
  emptyMessage: string;
  /** Filters and search (components that use the same URL parameters). */
  toolbar?: ReactNode;
  /**
   * Bulk actions for the selection (IDs on the page or every result of the
   * filter); without them there is no selection. `count` is the approximate total.
   */
  bulkActions?: (selection: BulkSelection, clear: () => void, count: number) => ReactNode;
  /** One card per row below 640 px (wide tables become a list). */
  renderCard?: (row: TData) => ReactNode;
}

function pageSelection<TData extends RowData>(
  table: HeaderContext<DataTableFeatures, TData>["table"],
): boolean | "indeterminate" {
  if (table.getIsAllPageRowsSelected()) return true;
  if (table.getIsSomePageRowsSelected()) return "indeterminate";
  return false;
}

/** "Select all on this page" checkbox (component defined outside render). */
function SelectAllHeader<TData extends RowData>({
  table,
}: HeaderContext<DataTableFeatures, TData>) {
  return (
    <Checkbox
      checked={pageSelection(table)}
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
 * Table transition for the filter bar: filter changed → the table shows as
 * "loading" (aria-busy, dimmed) until the new data arrives.
 */
const TableTransitionContext = createContext<TransitionStartFunction | null>(null);

export function useTableTransition(): TransitionStartFunction {
  const startTransition = use(TableTransitionContext);
  if (!startTransition) throw new Error("useTableTransition outside a DataTable");
  return startTransition;
}

function totalLabel({ total, capped }: PageInfo): string {
  if (capped) return `Mais de ${formatNumber(total)} resultados`;
  return total === 1 ? "1 resultado" : `${formatNumber(total)} resultados`;
}

function selectionLabel(allMatching: boolean, selected: number, total: number): string {
  if (allMatching) return `Todos os ${formatNumber(total)} resultados`;
  return selected === 1 ? "1 selecionado" : `${selected} selecionados`;
}

/** Bar shown when rows are checked: how many, "select all" and the actions. */
function SelectionBar({
  label,
  offerAll,
  page,
  onSelectAll,
  onClear,
  children,
}: {
  label: string;
  /** The whole page is checked and there are more results beyond it. */
  offerAll: boolean;
  page: PageInfo;
  onSelectAll: () => void;
  onClear: () => void;
  children: ReactNode;
}) {
  return (
    <div className="panel flex flex-wrap items-center gap-3 rounded-xl px-4 py-2.5 text-sm">
      <span className="font-medium">{label}</span>
      {offerAll ? (
        // Above the limit the server always rejects the bulk action (server/table/selection.ts).
        page.capped ? (
          <span className="text-ink-muted">
            Mais de {formatNumber(page.total)} resultados: refine o filtro para agir em todos.
          </span>
        ) : (
          <Button variant="link" size="sm" onClick={onSelectAll}>
            Selecionar todos os {formatNumber(page.total)} resultados
          </Button>
        )
      ) : null}
      {children}
      <Button variant="ghost" size="sm" className="ml-auto" onClick={onClear}>
        Limpar seleção
      </Button>
    </div>
  );
}

function Pagination({
  page,
  pending,
  onPrev,
  onNext,
}: {
  page: PageInfo;
  pending: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <nav aria-label="Paginação" className="flex items-center justify-between gap-3 text-sm">
      <span className="text-ink-muted">{totalLabel(page)}</span>
      <span className="flex gap-2">
        <Button variant="outline" size="sm" disabled={!page.prevCursor || pending} onClick={onPrev}>
          <ChevronLeft aria-hidden="true" />
          Anterior
        </Button>
        <Button variant="outline" size="sm" disabled={!page.nextCursor || pending} onClick={onNext}>
          Próxima
          <ChevronRight aria-hidden="true" />
        </Button>
      </span>
    </nav>
  );
}

/** Sorting, filters and pagination belong to the server: the table only displays and selects. */
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

  // Only counts what is on the current page (changing the filter "drops" the rest).
  const pageIds = new Set(data.map((row) => row.id));
  const selected = Object.keys(rowSelection).filter((id) => rowSelection[id] && pageIds.has(id));
  // "All results" only applies to the filter it was chosen under.
  const filterKey = filterQuery(useSearchParams()[0].toString());
  const [allFor, setAllFor] = useState<string | null>(null);
  const allMatching = allFor === filterKey && selected.length === data.length;
  const selection: BulkSelection = allMatching
    ? { kind: "filter", query: filterKey }
    : { kind: "ids", ids: selected };
  const count = allMatching ? page.total : selected.length;
  const clear = () => {
    setRowSelection({});
    setAllFor(null);
  };
  const go = (cursor: string | null, dir: "next" | "prev") => {
    clear();
    void runAndReport(() => setPage({ cursor, dir }));
  };

  return (
    <section aria-label={label} className="flex flex-col gap-3">
      {toolbar ? (
        <TableTransitionContext value={startTransition}>
          <div className="flex flex-wrap items-end gap-2">{toolbar}</div>
        </TableTransitionContext>
      ) : null}

      {bulkActions && selected.length > 0 ? (
        <SelectionBar
          label={selectionLabel(allMatching, selected.length, page.total)}
          offerAll={!allMatching && selected.length === data.length && page.total > data.length}
          page={page}
          onSelectAll={() => setAllFor(filterKey)}
          onClear={clear}
        >
          {bulkActions(selection, clear, count)}
        </SelectionBar>
      ) : null}

      <div
        aria-busy={pending}
        className={cn(
          "panel overflow-hidden rounded-2xl transition-opacity",
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
            {/* Desktop/tablet: table with horizontal scrolling when needed. */}
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
            {/* Phone: one card per row. */}
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

      <Pagination
        page={page}
        pending={pending}
        onPrev={() => go(page.prevCursor, "prev")}
        onNext={() => go(page.nextCursor, "next")}
      />
    </section>
  );
}
