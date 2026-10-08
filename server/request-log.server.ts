import { requestHeaders } from "@/server/request-context.server";
import type { Logger } from "pino";
import { logger } from "@/server/logger.server";

/** Request ID set in the middleware (or `undefined` outside a request). */
function getRequestId(): string | undefined {
  try {
    return requestHeaders().get("x-request-id") ?? undefined;
  } catch {
    return undefined;
  }
}

/** Logger with the current request's `request_id`, to tie together logs, errors and audit. */
export function requestLogger(bindings: Record<string, unknown> = {}): Logger {
  const requestId = getRequestId();
  return logger.child({ ...(requestId ? { request_id: requestId } : {}), ...bindings });
}
