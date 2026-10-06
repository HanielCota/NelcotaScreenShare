import "server-only";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { recordAudit } from "@/server/audit/record";
import { clientIpFrom } from "@/server/client-ip";
import type { Database } from "@/server/db";
import { logger } from "@/server/logger";
import { checkLockout, clearFailures, emailHash, recordFailure, type AuthScope } from "./lockout";

export const SIGN_IN_PATH = "/sign-in/email";
/** Login concluído pelo segundo fator (TOTP ou backup code). */
const TWO_FACTOR_SIGN_IN = new Set(["/two-factor/verify-totp", "/two-factor/verify-backup-code"]);

function lockedMessage(seconds: number): string {
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return `Muitas tentativas. Tente de novo em ${minutes} min.`;
}

function emailOf(body: unknown): string {
  return body && typeof body === "object" && "email" in body && typeof body.email === "string"
    ? body.email
    : "";
}

/** Auditoria nunca derruba o login: falha vira log. */
async function safeAudit(fn: () => Promise<void>) {
  try {
    await fn();
  } catch (error) {
    logger.error({ err: error }, "falha ao gravar auditoria de autenticação");
  }
}

/**
 * Hooks do Better Auth: bloqueio por senhas erradas (admins e participantes,
 * separados por `scope`) e, no painel admin, auditoria dos eventos de login.
 */
export function authHooks(
  db: Database,
  secret: string,
  scope: AuthScope,
  { audit }: { audit: boolean },
) {
  return {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== SIGN_IN_PATH) return;
      const hash = emailHash(secret, scope, emailOf(ctx.body));
      const status = await checkLockout(db, {
        scope,
        hash,
        ip: ctx.headers ? clientIpFrom(ctx.headers) : undefined,
      });
      if (status.locked) {
        if (audit) {
          await safeAudit(() =>
            recordAudit(db, "system", {
              action: "auth.lockout",
              resourceType: "admin_user",
              metadata: { email_hash: hash.slice(0, 16) },
            }),
          );
        }
        throw new APIError("TOO_MANY_REQUESTS", {
          message: lockedMessage(status.retryAfterSeconds),
        });
      }
    }),
    after: createAuthMiddleware(async (ctx) => {
      const returned = ctx.context.returned;
      const failed = returned instanceof APIError;

      if (audit && !failed && TWO_FACTOR_SIGN_IN.has(ctx.path)) {
        const userId = ctx.context.newSession?.user.id;
        if (userId) {
          await safeAudit(() =>
            recordAudit(
              db,
              { adminId: userId },
              {
                action: "auth.sign_in",
                resourceType: "admin_user",
                resourceId: userId,
                metadata: { segundo_fator: ctx.path.endsWith("backup-code") ? "backup" : "totp" },
              },
            ),
          );
        }
        return;
      }

      if (ctx.path !== SIGN_IN_PATH) return;
      const hash = emailHash(secret, scope, emailOf(ctx.body));
      if (failed) {
        if (returned.statusCode === 401) {
          await recordFailure(db, {
            scope,
            hash,
            ip: ctx.headers ? clientIpFrom(ctx.headers) : undefined,
          });
          logger.warn({ event: `${scope}.sign_in_failed` }, "login recusado");
          if (audit) {
            await safeAudit(() =>
              recordAudit(db, "system", {
                action: "auth.sign_in_failed",
                resourceType: "admin_user",
                // Só um pedaço do HMAC: agrupa tentativas sem guardar o e-mail.
                metadata: { email_hash: hash.slice(0, 16) },
              }),
            );
          }
        }
        return;
      }
      await clearFailures(db, { scope, hash });
      // Sem 2FA, a sessão nasce aqui; com 2FA, no verify (acima).
      const userId = ctx.context.newSession?.user.id;
      if (audit && userId) {
        await safeAudit(() =>
          recordAudit(
            db,
            { adminId: userId },
            { action: "auth.sign_in", resourceType: "admin_user", resourceId: userId },
          ),
        );
      }
    }),
  };
}
