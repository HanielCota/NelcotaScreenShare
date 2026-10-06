import "server-only";
import { headers } from "next/headers";
import type { Logger } from "pino";
import { logger } from "@/server/logger";

/** ID da requisição definido no `proxy.ts` (ou `undefined` fora de uma requisição). */
export async function getRequestId(): Promise<string | undefined> {
  try {
    return (await headers()).get("x-request-id") ?? undefined;
  } catch {
    return undefined;
  }
}

/** Logger com o `request_id` da requisição atual, para ligar logs, erros e audit. */
export async function requestLogger(bindings: Record<string, unknown> = {}): Promise<Logger> {
  const requestId = await getRequestId();
  return logger.child({ ...(requestId ? { request_id: requestId } : {}), ...bindings });
}
