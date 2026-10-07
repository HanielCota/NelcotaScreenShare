import { BodyTooLargeError, readBodyText } from "@/server/body.server";

/**
 * Largest body the authentication routes accept. The biggest legitimate one is a
 * profile photo (data URL of up to 180 kB) at sign-up or in the account.
 */
export const AUTH_MAX_BODY_BYTES = 256 * 1024;

const WITHOUT_BODY = new Set(["GET", "HEAD"]);

/**
 * Better Auth reads the whole body with `request.json()`, without a limit. This reads
 * it first, capped, and hands over an equivalent request, or answers 413/400.
 */
export async function boundAuthBody(request: Request): Promise<Request | Response> {
  if (WITHOUT_BODY.has(request.method) || !request.body) return request;
  let text: string;
  try {
    text = await readBodyText(request, AUTH_MAX_BODY_BYTES);
  } catch (error) {
    if (error instanceof BodyTooLargeError) {
      return Response.json(
        { code: "PAYLOAD_TOO_LARGE", message: "Requisição grande demais." },
        { status: 413 },
      );
    }
    return Response.json(
      { code: "INVALID_BODY", message: "Requisição inválida." },
      { status: 400 },
    );
  }
  const headers = new Headers(request.headers);
  // The length is recalculated from the text that was actually read.
  headers.delete("content-length");
  return new Request(request.url, {
    method: request.method,
    headers,
    body: text,
    signal: request.signal,
  });
}
