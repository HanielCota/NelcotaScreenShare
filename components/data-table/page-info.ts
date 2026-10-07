/** Table pagination: keyset cursors and the total (up to the count limit). */
export interface PageInfo {
  nextCursor: string | null;
  prevCursor: string | null;
  total: number;
  /** The total exceeded the count limit ("mais de 10.000"). */
  capped: boolean;
}

/** Only what the table needs from the page (without repeating the rows in the client payload). */
export function pageInfo({ nextCursor, prevCursor, total, capped }: PageInfo): PageInfo {
  return { nextCursor, prevCursor, total, capped };
}
