import "server-only";
import { headers } from "next/headers";
import pino, { type Logger } from "pino";

/**
 * Logger estruturado do servidor. Produção: JSON no stdout (o Coolify coleta),
 * sem transports nem worker threads. Desenvolvimento: `pino-pretty` legível.
 * Segredos e dados pessoais sensíveis são mascarados em qualquer nível.
 */
export const logger: Logger = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "info" : "debug"),
  base: { service: "nelcota" },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      "password",
      "*.password",
      "newPassword",
      "currentPassword",
      "token",
      "*.token",
      "secret",
      "*.secret",
      "authorization",
      "cookie",
      "headers.authorization",
      "headers.cookie",
      "totp*",
      "backupCodes",
    ],
    censor: "[oculto]",
  },
  ...(process.env.NODE_ENV === "development"
    ? {
        transport: {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "SYS:HH:MM:ss" },
        },
      }
    : {}),
});

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
