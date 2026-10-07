export class BodyTooLargeError extends Error {}

/** Limita os bytes recebidos, inclusive sem Content-Length ou com UTF-8 multibyte. */
export async function readBodyText(request: Request, maxBytes: number): Promise<string> {
  if (Number(request.headers.get("content-length") ?? 0) > maxBytes) {
    throw new BodyTooLargeError("payload_too_large");
  }
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxBytes) {
        // Cancelar destruiria o socket do adaptador Node antes da resposta 413.
        // O handler responde com Connection: close; o resto do corpo não é armazenado.
        throw new BodyTooLargeError("payload_too_large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks));
}
