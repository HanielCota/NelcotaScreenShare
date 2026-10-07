/** Uma página da listagem: itens e o cursor da próxima. */
interface PageOf<T> {
  items: T[];
  nextCursor: string | null;
}

/**
 * Percorre todas as páginas de uma listagem keyset (exportação CSV): pede a
 * próxima só quando a anterior terminou de ser lida.
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
