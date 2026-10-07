export class BodyTooLargeError extends Error {}

/** Caps the received bytes, even without Content-Length or with multibyte UTF-8. */
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
        // Cancelling would destroy the Node adapter's socket before the 413 response.
        // The handler replies with Connection: close; the rest of the body is not stored.
        throw new BodyTooLargeError("payload_too_large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks));
}
