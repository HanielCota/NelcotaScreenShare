/** One page of the listing: items and the cursor of the next one. */
interface PageOf<T> {
  items: T[];
  nextCursor: string | null;
}

/**
 * Walks every page of a keyset listing (CSV export): requests the
 * next one only after the previous one has been fully read.
 */
export async function* iterateAll<T>(
  page: (cursor: string | null) => Promise<PageOf<T>>,
): AsyncGenerator<T> {
  let cursor: string | null = null;
  for (;;) {
    const current: PageOf<T> = await page(cursor);
    yield* current.items;
    if (!current.nextCursor) return;
    cursor = current.nextCursor;
  }
}
