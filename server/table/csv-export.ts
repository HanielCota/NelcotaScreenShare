import "server-only";
import { CSV_BOM, csvRow } from "@/lib/csv";
import { logger } from "@/server/logger";

/**
 * Resposta CSV em stream: as linhas são lidas em lotes enquanto o download
 * acontece, sem montar o arquivo na memória.
 */
export function csvResponse(
  filename: string,
  header: string[],
  rows: AsyncIterable<unknown[]>,
): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        controller.enqueue(encoder.encode(CSV_BOM + csvRow(header)));
        for await (const row of rows) controller.enqueue(encoder.encode(csvRow(row)));
        controller.close();
      } catch (error) {
        logger.error({ err: error, filename }, "falha ao exportar CSV");
        controller.error(error);
      }
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
