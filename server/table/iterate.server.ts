import type { DbExecutor } from "@/server/db/index.server";

/** Rows read per page while exporting. */
const EXPORT_BATCH = 1000;

/** One page of the listing: items and the cursor of the next one. */
interface PageOf<T> {
  items: T[];
  nextCursor: string | null;
}

type Listing<TParams, T> = (
  db: DbExecutor,
  params: TParams,
  limit: number,
  options: { count: boolean },
) => Promise<PageOf<T>>;

/**
 * Every row of a keyset listing's filter (CSV export): requests the next
 * page only after the previous one has been fully read, without the totals.
 */
export function exportRows<TParams extends { cursor: string | null; dir: "next" | "prev" }, T>(
  list: Listing<TParams, T>,
) {
  return async function* rows(db: DbExecutor, params: TParams): AsyncGenerator<T> {
    let cursor: string | null = null;
    for (;;) {
      const page: PageOf<T> = await list(db, { ...params, cursor, dir: "next" }, EXPORT_BATCH, {
        count: false,
      });
      yield* page.items;
      if (!page.nextCursor) return;
      cursor = page.nextCursor;
    }
  };
}
