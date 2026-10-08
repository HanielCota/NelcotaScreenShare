import { debounce, useQueryStates } from "nuqs";
import { useTableTransition } from "@/components/data-table/DataTable";
import {
  FilterActions,
  FilterDate,
  FilterSearch,
  FilterSelect,
} from "@/components/data-table/filters";
import { actionLabel, resourceLabel } from "@/features/admin/audit/domain/labels";
import { AUDIT_FILTERS, auditParsers } from "@/features/admin/audit/domain/search-params";
import { filterState, resetPage } from "@/lib/table-params";

export interface AuditFilterOptions {
  actions: string[];
  resources: string[];
  admins: { id: string; name: string; email: string }[];
}

export function AuditFilters({
  options,
  exportHref,
}: {
  options: AuditFilterOptions;
  exportHref: string | null;
}) {
  const startTransition = useTableTransition();
  const [params, setParams] = useQueryStates(auditParsers, { shallow: false, startTransition });
  const set = (
    patch: Partial<Record<"acao" | "recurso" | "autor" | "de" | "ate", string | null>>,
  ) => void setParams({ ...patch, ...resetPage });
  const filters = filterState(AUDIT_FILTERS, params);

  return (
    <>
      <FilterSearch
        type="text"
        label="request_id ou ID do recurso"
        placeholder="Cole um ID"
        value={params.q}
        // Only the typed search waits for the person to stop typing.
        onChange={(q) =>
          void setParams({ q: q || null, ...resetPage }, { limitUrlUpdates: debounce(350) })
        }
      />
      <FilterSelect
        label="Ação"
        value={params.acao}
        allLabel="Todas"
        options={options.actions.map((action) => ({ value: action, label: actionLabel(action) }))}
        onChange={(acao) => set({ acao })}
      />
      <FilterSelect
        label="Admin"
        value={params.autor}
        allLabel="Todos"
        options={options.admins.map((admin) => ({ value: admin.id, label: admin.name }))}
        onChange={(autor) => set({ autor })}
      />
      <FilterSelect
        label="Recurso"
        value={params.recurso}
        allLabel="Todos"
        options={options.resources.map((resource) => ({
          value: resource,
          label: resourceLabel(resource),
        }))}
        onChange={(recurso) => set({ recurso })}
      />
      <FilterDate label="De" value={params.de} onChange={(de) => set({ de })} />
      <FilterDate label="Até" value={params.ate} onChange={(ate) => set({ ate })} />
      <FilterActions
        active={filters.active}
        exportHref={exportHref}
        onClear={() => void setParams({ ...filters.cleared, ...resetPage })}
      />
    </>
  );
}
