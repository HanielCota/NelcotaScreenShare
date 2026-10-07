import { requestHeaders } from "@/server/request-context.server";
import type { Logger } from "pino";
import { logger } from "@/server/logger.server";

/** ID da requisição definido no middleware (ou `undefined` fora de uma requisição). */
async function getRequestId(): Promise<string | undefined> {
  try {
    return requestHeaders().get("x-request-id") ?? undefined;
  } catch {
    return undefined;
  }
}

/** Logger com o `request_id` da requisição atual, para ligar logs, erros e audit. */
export async function requestLogger(bindings: Record<string, unknown> = {}): Promise<Logger> {
  const requestId = await getRequestId();
  return logger.child({ ...(requestId ? { request_id: requestId } : {}), ...bindings });
}
