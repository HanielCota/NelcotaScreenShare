import pino, { type Logger } from "pino";
import { createRequire } from "node:module";
import { logLevelSchema } from "@/server/env.server";

/**
 * Structured server logger. Production: JSON on stdout (Coolify collects it),
 * no transports or worker threads. Development: readable `pino-pretty`.
 * Secrets and sensitive personal data are masked at every level.
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
      "email",
      "*.email",
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
