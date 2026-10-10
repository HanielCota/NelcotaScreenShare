export class BodyTooLargeError extends Error {}

/** Drain without retaining bytes so a 413 can reach the client while its upload finishes. */
async function discardBody(reader: ReadableStreamDefaultReader<Uint8Array>) {
  try {
    for (;;) {
      const { done } = await reader.read();
      if (done) return;
    }
  } catch {
    // A client aborting its rejected upload requires no further response.
  } finally {
    reader.releaseLock();
  }
}

/** Caps the received bytes, even without Content-Length or with multibyte UTF-8. */
export async function readBodyText(request: Request, maxBytes: number): Promise<string> {
  if (Number(request.headers.get("content-length") ?? 0) > maxBytes) {
    if (request.body) void discardBody(request.body.getReader());
    throw new BodyTooLargeError("payload_too_large");
  }
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  let discarding = false;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxBytes) {
        // Cancelling or closing the connection can reset an upload before the 413 is read.
        discarding = true;
        void discardBody(reader);
        throw new BodyTooLargeError("payload_too_large");
      }
      chunks.push(value);
    }
  } finally {
    if (!discarding) reader.releaseLock();
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks));
}

/** Small JSON requests (token, raised hand, waitlist): anything bigger is not legitimate. */
export const SMALL_JSON_MAX_BYTES = 16 * 1024;

/** JSON body capped at `maxBytes`; `null` when it is too large, not UTF-8 or not JSON. */
export async function readJsonBody(request: Request, maxBytes: number): Promise<unknown> {
  try {
    return JSON.parse(await readBodyText(request, maxBytes));
  } catch {
    // Every one of those cases is the same invalid request for the caller (400).
    return null;
  }
}
