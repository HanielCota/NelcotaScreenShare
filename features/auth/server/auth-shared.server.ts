import { APIError, createAuthMiddleware } from "better-auth/api";
import { eq } from "drizzle-orm";
import { profilePhotoSchema } from "@/features/account/domain/profile-photo";
import { recordAudit } from "@/server/audit.server";
import { clientIpFrom } from "@/server/client-ip.server";
import type { Database } from "@/server/db/index.server";
import { users } from "@/server/db/schema";
import { logger } from "@/server/logger.server";
import {
  checkLockout,
  clearFailures,
  emailHash,
  recordFailure,
  type AuthScope,
} from "./lockout.server";

const SIGN_IN_PATH = "/sign-in/email";

/** Critical actions require a recent sign-in: Better Auth (freshAge) and actions use the same window. */
export const FRESH_SESSION_SECONDS = 10 * 60;

/** Per-IP limits shared by the panel and participant accounts (window in seconds). */
export const AUTH_RATE_LIMIT_RULES = {
  [SIGN_IN_PATH]: { window: 60, max: 5 },
  "/request-password-reset": { window: 60, max: 3 },
  "/reset-password": { window: 60, max: 5 },
  "/two-factor/verify-totp": { window: 60, max: 10 },
  "/two-factor/verify-backup-code": { window: 60, max: 5 },
};
/** Sign-in completed by the second factor (TOTP or backup code). */
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

function validateProfilePhoto(body: unknown) {
  if (!body || typeof body !== "object" || !("image" in body) || body.image === undefined) return;
  const parsed = profilePhotoSchema.safeParse(body.image);
  if (!parsed.success) throw new APIError("BAD_REQUEST", { message: "Foto de perfil inválida." });
  if (parsed.data === null) return;
  const bytes = Buffer.from(parsed.data.split(",")[1] ?? "", "base64");
  if (bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WEBP") {
    throw new APIError("BAD_REQUEST", { message: "Foto de perfil inválida." });
  }
}

function resetTokenOf(body: unknown): string | undefined {
  return body && typeof body === "object" && "token" in body && typeof body.token === "string"
    ? body.token
    : undefined;
}

async function validatePasswordReset(
  db: Database,
  token: string | undefined,
  findVerification: (identifier: string) => Promise<{ value: string } | null>,
) {
  if (!token) return;
  const verification = await findVerification(`reset-password:${token}`);
  if (!verification) return;
  const [user] = await db
    .select({ deletedAt: users.deletedAt, anonymizedAt: users.anonymizedAt })
    .from(users)
    .where(eq(users.id, verification.value));
  if (!user || user.deletedAt || user.anonymizedAt) {
    throw new APIError("BAD_REQUEST", {
      code: "INVALID_TOKEN",
      message: "Link de recuperação inválido.",
    });
  }
}

/** Auditing never breaks sign-in: a failure becomes a log entry. */
async function safeAudit(fn: () => Promise<void>) {
  try {
    await fn();
  } catch (error) {
    logger.error({ err: error }, "falha ao gravar auditoria de autenticação");
  }
}

/**
 * Better Auth hooks: lockout after wrong passwords (admins and participants,
 * separated by `scope`) and, in the admin panel, auditing of sign-in events.
 */
export function authHooks(
  db: Database,
  secret: string,
  scope: AuthScope,
  { audit }: { audit: boolean },
) {
  return {
    before: createAuthMiddleware(async (ctx) => {
      if (scope === "user") {
        if (ctx.path === "/update-user" || ctx.path === "/sign-up/email")
          validateProfilePhoto(ctx.body);
        if (ctx.path === "/reset-password") {
          await validatePasswordReset(
            db,
            resetTokenOf(ctx.body) || resetTokenOf(ctx.query),
            (identifier) => ctx.context.internalAdapter.findVerificationValue(identifier),
          );
        }
      }
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
                // Only part of the HMAC: groups attempts without storing the e-mail.
                metadata: { email_hash: hash.slice(0, 16) },
              }),
            );
          }
        }
        return;
      }
      await clearFailures(db, { scope, hash });
      // Without 2FA, the session is born here; with 2FA, in verify (above).
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
