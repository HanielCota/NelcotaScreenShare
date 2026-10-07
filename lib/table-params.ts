import { parseAsString, parseAsStringLiteral } from "nuqs/server";

/**
 * URL parameters shared by every admin table (state in the URL: the link can be
 * shared and history navigation works). Each feature adds its own filters.
 */
export const pageParsers = {
  cursor: parseAsString,
  dir: parseAsStringLiteral(["next", "prev"] as const).withDefault("next"),
  ordem: parseAsStringLiteral(["asc", "desc"] as const).withDefault("desc"),
};

/** "de/até" (from/until) range in São Paulo days (YYYY-MM-DD), shared by the admin tables. */
export const periodParsers = {
  de: parseAsString,
  ate: parseAsString,
};

/** Changing a filter or the sort goes back to the first page. */
export const resetPage = { cursor: null, dir: null } as const;

export const PAGE_SIZE = 50;

/**
 * Target of a bulk action: IDs checked on the page (up to 500) or every
 * result of the current filter (`busca` = URL query string, without the page),
 * which the server reapplies with a limit of 10,000.
 */
export type BulkSelection = { tipo: "ids"; ids: string[] } | { tipo: "filtro"; busca: string };

export const BULK_IDS_LIMIT = 500;
export const BULK_FILTER_LIMIT = 10_000;

/** Filter query string, without the page cursor. */
export function filterQuery(search: URLSearchParams | string): string {
  const params = new URLSearchParams(search);
  params.delete("cursor");
  params.delete("dir");
  params.sort();
  return params.toString();
}
