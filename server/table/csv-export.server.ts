import { CSV_BOM, csvRow } from "@/lib/csv";
import { logger } from "@/server/logger.server";

/**
 * Streamed CSV response: each row is read only when the download asks for more
 * (`pull`), without building the file in memory. A cancelled download stops the reading.
 */
export function csvResponse(
  filename: string,
  header: string[],
  rows: AsyncIterable<unknown[]>,
): Response {
  const encoder = new TextEncoder();
  const iterator = rows[Symbol.asyncIterator]();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(CSV_BOM + csvRow(header)));
    },
    async pull(controller) {
      try {
        const next = await iterator.next();
        if (next.done) controller.close();
        else controller.enqueue(encoder.encode(csvRow(next.value)));
      } catch (error) {
        logger.error({ err: error, filename }, "falha ao exportar CSV");
        controller.error(error);
      }
    },
    async cancel() {
      await iterator.return?.();
    },
  });
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
