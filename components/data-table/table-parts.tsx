import type { RowData } from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/format";
import type { PageInfo } from "./page-info";

function totalLabel({ total, capped }: PageInfo): string {
  if (capped) return `Mais de ${formatNumber(total)} resultados`;
  return total === 1 ? "1 resultado" : `${formatNumber(total)} resultados`;
}

export function selectionLabel(allMatching: boolean, selected: number, total: number): string {
  if (allMatching) return `Todos os ${formatNumber(total)} resultados`;
  return selected === 1 ? "1 selecionado" : `${selected} selecionados`;
}

/** Bar shown when rows are checked: how many, "select all" and the actions. */
export function SelectionBar({
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

export function Pagination({
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

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-16 text-center text-ink-muted">
      <Inbox className="size-8 text-ink-subtle" aria-hidden="true" />
      <p>{message}</p>
    </div>
  );
}

/** Phone: one card per row. */
export function CardList<TData extends RowData & { id: string }>({
  data,
  renderCard,
}: {
  data: TData[];
  renderCard: (row: TData) => ReactNode;
}) {
  return (
    <ul className="flex flex-col divide-y divide-line sm:hidden">
      {data.map((row) => (
        <li key={row.id} className="p-4">
          {renderCard(row)}
        </li>
      ))}
    </ul>
  );
}
