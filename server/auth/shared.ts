import "server-only";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { clientIpFrom } from "@/server/client-ip";
import type { Database } from "@/server/db";
import { logger } from "@/server/logger";
import { checkLockout, clearFailures, emailHash, recordFailure, type AuthScope } from "./lockout";

export const SIGN_IN_PATH = "/sign-in/email";

function lockedMessage(seconds: number): string {
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return `Muitas tentativas. Tente de novo em ${minutes} min.`;
}

function emailOf(body: unknown): string {
  return body && typeof body === "object" && "email" in body && typeof body.email === "string"
    ? body.email
    : "";
}

/**
 * Hooks do Better Auth para o bloqueio por senhas erradas (admins e
 * participantes usam o mesmo mecanismo, separados por `scope`).
 */
export function lockoutHooks(db: Database, secret: string, scope: AuthScope) {
  return {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== SIGN_IN_PATH) return;
      const status = await checkLockout(db, {
        scope,
        hash: emailHash(secret, scope, emailOf(ctx.body)),
        ip: ctx.headers ? clientIpFrom(ctx.headers) : undefined,
      });
      if (status.locked) {
        throw new APIError("TOO_MANY_REQUESTS", {
          message: lockedMessage(status.retryAfterSeconds),
        });
      }
    }),
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== SIGN_IN_PATH) return;
      const hash = emailHash(secret, scope, emailOf(ctx.body));
      const returned = ctx.context.returned;
      if (returned instanceof APIError) {
        if (returned.statusCode === 401) {
          await recordFailure(db, {
            scope,
            hash,
            ip: ctx.headers ? clientIpFrom(ctx.headers) : undefined,
          });
          logger.warn({ event: `${scope}.sign_in_failed` }, "login recusado");
        }
        return;
      }
      await clearFailures(db, { scope, hash });
    }),
  };
}
