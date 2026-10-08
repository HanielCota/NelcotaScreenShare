import { and, asc, desc, eq, gt, lt, or, sql, type AnyColumn, type SQL } from "drizzle-orm";
import { z } from "zod";
import type { DbExecutor } from "@/server/db/index.server";

/**
 * Keyset pagination (docs/archive/admin-plan.md §2.6): `WHERE (col, id) < (v, id)`
 * instead of OFFSET, stable with hundreds of thousands of rows and with ties
 * in the sort column (the id breaks ties). Previous/next with cursors.
 */
type Direction = "asc" | "desc";
type PageDirection = "next" | "prev";

const cursorSchema = z.object({
  /** Value of the sort column (dates in ISO). */
  v: z.union([z.string().max(200), z.number(), z.null()]),
  id: z.string().max(64),
});
export type Cursor = z.infer<typeof cursorSchema>;

function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

/** An invalid (hand-edited) cursor becomes "first page", without an error. */
function decodeCursor(raw: string | null | undefined): Cursor | undefined {
  if (!raw || raw.length > 500) return undefined;
  try {
    const parsed = cursorSchema.safeParse(JSON.parse(Buffer.from(raw, "base64url").toString()));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

export interface SortColumn<TRow> {
  column: AnyColumn;
  /** Cursor value from a row. */
  valueOf: (row: TRow) => string | number | null;
  /** Converts the cursor value back for comparison in SQL. */
  parse?: (value: string | number | null) => unknown;
}

function flip(direction: Direction): Direction {
  return direction === "asc" ? "desc" : "asc";
}

/** "After the cursor" condition for the query's effective order. */
function afterCursor(
  sort: Pick<SortColumn<unknown>, "column" | "parse">,
  idColumn: AnyColumn,
  cursor: Cursor,
  order: Direction,
  page: PageDirection,
): SQL | undefined {
  const value = sort.parse ? sort.parse(cursor.v) : cursor.v;
  const beyond = order === "desc" ? lt : gt;
  if (value === null) {
    // When going back, nulls come first and filled values come after.
    return or(
      and(sql`${sort.column} is null`, beyond(idColumn, cursor.id)),
      page === "prev" ? sql`${sort.column} is not null` : undefined,
    );
  }
  // A row comparison becomes an index range, instead of filtering earlier rows.
  if (sort.column.notNull) {
    const operator = sql.raw(order === "desc" ? "<" : ">");
    return sql`(${sort.column}, ${idColumn}) ${operator} (${value}, ${cursor.id})`;
  }
  return or(
    beyond(sort.column, value),
    and(eq(sort.column, value), beyond(idColumn, cursor.id)),
    page === "next" ? sql`${sort.column} is null` : undefined,
  );
}

interface KeysetQuery<TRow> {
  sort: SortColumn<TRow>;
  idColumn: AnyColumn;
  direction: Direction;
  cursor: Cursor | undefined;
  page: PageDirection;
  limit: number;
}

/** WHERE and ORDER BY of the requested page (the "previous" one queries in reverse order). */
function keysetClauses<TRow>(query: KeysetQuery<TRow>) {
  const order = query.page === "prev" ? flip(query.direction) : query.direction;
  const by = order === "desc" ? desc : asc;
  // Drizzle indexes use DESC NULLS LAST; their reverse order is ASC NULLS FIRST.
  // Null placement does not change non-null columns, but must match the index for a seek.
  const indexNulls = order === "desc" ? "nulls last" : "nulls first";
  const sortNulls = query.sort.column.notNull
    ? indexNulls
    : query.page === "prev"
      ? "nulls first"
      : "nulls last";
  return {
    where: query.cursor
      ? afterCursor(query.sort, query.idColumn, query.cursor, order, query.page)
      : undefined,
    orderBy: [
      sql`${by(query.sort.column)} ${sql.raw(sortNulls)}`,
      sql`${by(query.idColumn)} ${sql.raw(indexNulls)}`,
    ],
    limit: query.limit + 1,
  };
}

interface Page<TRow> {
  items: TRow[];
  nextCursor: string | null;
  prevCursor: string | null;
}

/** Builds the page from the `limit + 1` rows read. */
function keysetPage<TRow extends { id: string }>(
  rows: TRow[],
  query: KeysetQuery<TRow>,
): Page<TRow> {
  const hasMore = rows.length > query.limit;
  const items = rows.slice(0, query.limit);
  if (query.page === "prev") items.reverse();
  const hasNext = query.page === "prev" ? true : hasMore;
  const hasPrev = query.page === "prev" ? hasMore : query.cursor !== undefined;
  const first = items[0];
  const last = items.at(-1);
  return {
    items,
    nextCursor: hasNext && last ? encodeCursor({ v: query.sort.valueOf(last), id: last.id }) : null,
    prevCursor:
      hasPrev && first ? encodeCursor({ v: query.sort.valueOf(first), id: first.id }) : null,
  };
}

/** Total up to 10,000 (above that, "more than 10,000"): a full COUNT(*) would be expensive. */
export const COUNT_CAP = 10_000;

export async function approximateCount(
  executor: DbExecutor,
  subquery: SQL,
): Promise<{ total: number; capped: boolean }> {
  const result = await executor.execute<{ total: number }>(
    sql`select count(*)::int as total from (${subquery} limit ${COUNT_CAP + 1}) as limited`,
  );
  const total = result.rows[0]?.total ?? 0;
  return { total: Math.min(total, COUNT_CAP), capped: total > COUNT_CAP };
}

/**
 * Generic sortable column: the cursor stores the value as Postgres text
 * (exact, including microseconds: a JS `Date` only keeps milliseconds and would
 * make the boundary row repeat or disappear) and casts it back to the column
 * type. Select `key` as `sortKey` in the query.
 */
export function sortableColumn<TRow extends { sortKey: string | null }>(
  column: AnyColumn,
  pgType: "timestamptz" | "int" | "text",
): SortColumn<TRow> & { key: SQL<string | null> } {
  return {
    column,
    key: sql<string | null>`${column}::text`,
    valueOf: (row) => row.sortKey,
    parse: (value) => (typeof value === "string" ? sql`${value}::${sql.raw(pgType)}` : value),
  };
}

/** URL state every admin listing shares (see `pageParsers`). */
interface ListingParams {
  ordem: Direction;
  cursor: string | null;
  dir: PageDirection;
}

interface KeysetList<TRaw, TItem> {
  sort: SortColumn<TRaw>;
  idColumn: AnyColumn;
  params: ListingParams;
  limit: number;
  /** The export reads in batches and does not need the total for each one. */
  count: boolean;
  /** The listing's own query, narrowed by the page clauses. */
  rows: (clauses: ReturnType<typeof keysetClauses<TRaw>>) => PromiseLike<TRaw[]>;
  /** `select 1 from ... where <filters>`, counted up to `COUNT_CAP`. */
  countQuery: SQL;
  toItem: (raw: TRaw) => TItem;
}

/** One page of an admin listing, with the approximate total of its filter. */
export async function keysetList<TRaw extends { id: string }, TItem>(
  db: DbExecutor,
  spec: KeysetList<TRaw, TItem>,
) {
  const query: KeysetQuery<TRaw> = {
    sort: spec.sort,
    idColumn: spec.idColumn,
    direction: spec.params.ordem,
    cursor: decodeCursor(spec.params.cursor),
    page: spec.params.dir,
    limit: spec.limit,
  };
  const [rows, total] = await Promise.all([
    spec.rows(keysetClauses(query)),
    spec.count ? approximateCount(db, spec.countQuery) : { total: 0, capped: false },
  ]);
  const page = keysetPage(rows, query);
  return {
    items: page.items.map(spec.toItem),
    nextCursor: page.nextCursor,
    prevCursor: page.prevCursor,
    ...total,
  };
}
