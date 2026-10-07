import { z } from "zod";
import { ActionError } from "@/server/operations/action-error";
import { BULK_FILTER_LIMIT, BULK_IDS_LIMIT, filterQuery } from "@/lib/table-params";

/** Input of the bulk actions (see `BulkSelection`). */
export const bulkSelectionSchema = z.discriminatedUnion("tipo", [
  z.object({ tipo: z.literal("ids"), ids: z.array(z.uuid()).min(1).max(BULK_IDS_LIMIT) }),
  z.object({ tipo: z.literal("filtro"), busca: z.string().max(2000) }),
]);
export type BulkSelectionInput = z.infer<typeof bulkSelectionSchema>;

/**
 * Target IDs of the action. By filter, the server reapplies the search (it never trusts
 * IDs coming from the browser for "all") and refuses above 10,000.
 */
export async function resolveSelection(
  selection: BulkSelectionInput,
  idsForFilter: (search: URLSearchParams, limit: number) => Promise<string[]>,
): Promise<string[]> {
  if (selection.tipo === "ids") return [...new Set(selection.ids)];
  const ids = await idsForFilter(
    new URLSearchParams(filterQuery(selection.busca)),
    BULK_FILTER_LIMIT + 1,
  );
  if (ids.length > BULK_FILTER_LIMIT) {
    throw new ActionError("Mais de 10.000 resultados. Refine o filtro e tente de novo.");
  }
  return ids;
}
