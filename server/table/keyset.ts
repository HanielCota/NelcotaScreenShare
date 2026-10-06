import "server-only";
import { and, asc, desc, eq, gt, lt, or, sql, type AnyColumn, type SQL } from "drizzle-orm";
import { z } from "zod";
import type { DbExecutor } from "@/server/db";

/**
 * Paginação keyset (docs/PLANO-ADMIN.md §2.6): `WHERE (col, id) < (v, id)`
 * em vez de OFFSET, estável com centenas de milhares de linhas e com empates
 * na coluna de ordenação (o id desempata). Anterior/próxima com cursores.
 */
export type Direction = "asc" | "desc";
export type PageDirection = "next" | "prev";

const cursorSchema = z.object({
  /** Valor da coluna de ordenação (datas em ISO). */
  v: z.union([z.string().max(200), z.number(), z.null()]),
  id: z.string().max(64),
});
export type Cursor = z.infer<typeof cursorSchema>;

export function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

/** Cursor inválido (mexido à mão) vira "primeira página", sem erro. */
export function decodeCursor(raw: string | null | undefined): Cursor | undefined {
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
  /** Valor do cursor a partir de uma linha. */
  valueOf: (row: TRow) => string | number | null;
  /** Converte o valor do cursor de volta para comparar no SQL. */
  parse?: (value: string | number | null) => unknown;
}

function flip(direction: Direction): Direction {
  return direction === "asc" ? "desc" : "asc";
}

/** Condição "depois do cursor" para a ordem efetiva da consulta. */
function afterCursor(
  sort: SortColumn<unknown>,
  idColumn: AnyColumn,
  cursor: Cursor,
  order: Direction,
): SQL | undefined {
  const value = sort.parse ? sort.parse(cursor.v) : cursor.v;
  const beyond = order === "desc" ? lt : gt;
  if (value === null) {
    // Nulos ficam no fim (NULLS LAST): depois deles, só desempate por id.
    return and(sql`${sort.column} is null`, beyond(idColumn, cursor.id));
  }
  return or(
    beyond(sort.column, value),
    and(eq(sort.column, value), beyond(idColumn, cursor.id)),
    order === "desc" ? sql`${sort.column} is null` : undefined,
  );
}

export interface KeysetQuery<TRow> {
  sort: SortColumn<TRow>;
  idColumn: AnyColumn;
  direction: Direction;
  cursor: Cursor | undefined;
  page: PageDirection;
  limit: number;
}

/** WHERE e ORDER BY da página pedida (a de "anterior" consulta na ordem inversa). */
export function keysetClauses<TRow>(query: KeysetQuery<TRow>) {
  const order = query.page === "prev" ? flip(query.direction) : query.direction;
  const by = order === "desc" ? desc : asc;
  return {
    where: query.cursor
      ? afterCursor(query.sort as SortColumn<unknown>, query.idColumn, query.cursor, order)
      : undefined,
    orderBy: [sql`${by(query.sort.column)} nulls last`, by(query.idColumn)],
    limit: query.limit + 1,
  };
}

export interface Page<TRow> {
  items: TRow[];
  nextCursor: string | null;
  prevCursor: string | null;
}

/** Monta a página a partir das `limit + 1` linhas lidas. */
export function keysetPage<TRow extends { id: string }>(
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

/** Total até 10.000 (acima disso, "mais de 10.000"): COUNT(*) inteiro custaria caro. */
export const COUNT_CAP = 10_000;

export async function approximateCount(
  executor: DbExecutor,
  subquery: SQL,
): Promise<{ total: number; capped: boolean }> {
  const result = await executor.execute<{ total: number }>(
    sql`select count(*)::int as total from (${subquery} limit ${COUNT_CAP + 1}) as limited`,
  );
  const total = Number(result.rows[0]?.total ?? 0);
  return { total: Math.min(total, COUNT_CAP), capped: total > COUNT_CAP };
}

/**
 * Timestamps no cursor: o texto exato do Postgres (microssegundos). Um `Date`
 * do JS só guarda milissegundos e faria a linha da fronteira repetir ou sumir.
 * Selecione a coluna com `timestampKey(col)` e compare com `parse`.
 */
export function timestampKey(column: AnyColumn) {
  return sql<string>`${column}::text`;
}

export const timestampCursor = {
  parse: (value: string | number | null) =>
    typeof value === "string" ? sql`${value}::timestamptz` : value,
};

/**
 * Coluna ordenável genérica: o cursor guarda o valor como texto do Postgres
 * (exato, inclusive microssegundos) e volta com cast para o tipo da coluna.
 * Selecione `key` como `sortKey` na consulta.
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
