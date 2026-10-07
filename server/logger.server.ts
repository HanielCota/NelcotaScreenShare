import pino, { type Logger } from "pino";
import { createRequire } from "node:module";
import { logLevelSchema } from "@/server/env.server";

/**
 * Logger estruturado do servidor. Produção: JSON no stdout (o Coolify coleta),
 * sem transports nem worker threads. Desenvolvimento: `pino-pretty` legível.
 * Segredos e dados pessoais sensíveis são mascarados em qualquer nível.
 */
export const logger: Logger = pino({
  level:
    logLevelSchema.parse(process.env.LOG_LEVEL) ??
    (process.env.NODE_ENV === "production" ? "info" : "debug"),
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
          target: createRequire(import.meta.url).resolve("pino-pretty"),
          options: { colorize: true, translateTime: "SYS:HH:MM:ss" },
        },
      }
    : {}),
});
