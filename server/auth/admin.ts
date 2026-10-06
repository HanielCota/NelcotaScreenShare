import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins/admin";
import { twoFactor } from "better-auth/plugins/two-factor";
import { CLIENT_IP_HEADER } from "@/server/client-ip";
import { getDb, type Database } from "@/server/db";
import {
  adminAccounts,
  adminRateLimits,
  adminSessions,
  adminTwoFactors,
  adminUsers,
  adminVerifications,
} from "@/server/db/schema";
import { appUrl, getEnv } from "@/server/env";
import { logger } from "@/server/logger";
import { mailLayout, sendMail } from "@/server/mail";
import { hashPassword, PASSWORD_LIMITS, verifyPassword } from "./password";
import { ac, roles } from "./permissions";
import { lockoutHooks, SIGN_IN_PATH } from "./shared";

export const ADMIN_AUTH_BASE_PATH = "/api/admin/auth";

function createAdminAuth(db: Database, secret: string) {
  const production = process.env.NODE_ENV === "production";

  return betterAuth({
    appName: "Nelcota Admin",
    baseURL: appUrl(),
    basePath: ADMIN_AUTH_BASE_PATH,
    secret,
    trustedOrigins: [appUrl()],
    telemetry: { enabled: false },
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        adminUsers,
        adminSessions,
        adminAccounts,
        adminVerifications,
        adminTwoFactors,
        adminRateLimits,
      },
    }),
    user: { modelName: "adminUsers" },
    account: { modelName: "adminAccounts", accountLinking: { enabled: false } },
    verification: { modelName: "adminVerifications" },
    session: {
      modelName: "adminSessions",
      // 12 h sem uso derrubam a sessão; o máximo absoluto (7 dias) é checado no DAL.
      expiresIn: 12 * 60 * 60,
      updateAge: 60 * 60,
      // Ações críticas exigem login nos últimos 10 min (senha, papel, 2FA, exclusão).
      freshAge: 10 * 60,
      // Sem cache em cookie: sessão revogada deixa de valer na próxima requisição.
      cookieCache: { enabled: false },
    },
    emailAndPassword: {
      enabled: true,
      // Admins só entram por convite.
      disableSignUp: true,
      minPasswordLength: PASSWORD_LIMITS.admin.min,
      maxPasswordLength: PASSWORD_LIMITS.admin.max,
      password: { hash: hashPassword, verify: verifyPassword },
      resetPasswordTokenExpiresIn: 30 * 60,
      revokeSessionsOnPasswordReset: true,
      // Disparado sem esperar: o tempo de resposta não revela se o e-mail existe.
      sendResetPassword: async ({ user, url }) => {
        const mail = mailLayout({
          title: "Redefinir senha do painel Nelcota",
          intro: `Olá, ${user.name}. Recebemos um pedido para redefinir a senha do painel admin. O link vale por 30 minutos e só pode ser usado uma vez.`,
          action: { label: "Definir nova senha", url },
          outro: "Se não foi você, ignore este e-mail: sua senha continua a mesma.",
        });
        void sendMail({ to: user.email, subject: "Redefinir senha do painel", ...mail }).catch(
          (error: unknown) => logger.error({ err: error }, "falha ao enviar e-mail de redefinição"),
        );
      },
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      modelName: "adminRateLimits",
      window: 60,
      max: 100,
      customRules: {
        [SIGN_IN_PATH]: { window: 60, max: 5 },
        "/request-password-reset": { window: 60, max: 3 },
        "/reset-password": { window: 60, max: 5 },
        "/two-factor/verify-totp": { window: 60, max: 10 },
        "/two-factor/verify-backup-code": { window: 60, max: 5 },
      },
    },
    advanced: {
      cookiePrefix: "nelcota-admin",
      useSecureCookies: production,
      defaultCookieAttributes: { sameSite: "strict", httpOnly: true, path: "/" },
      // IDs gerados pelo Postgres (uuidv7()).
      database: { generateId: false },
      ipAddress: { ipAddressHeaders: [CLIENT_IP_HEADER] },
    },
    hooks: lockoutHooks(db, secret, "admin"),
    plugins: [
      twoFactor({
        issuer: "Nelcota Admin",
        schema: { twoFactor: { modelName: "adminTwoFactors" } },
        backupCodeOptions: { amount: 10, length: 10 },
      }),
      admin({
        ac,
        roles,
        defaultRole: "viewer",
        adminRoles: ["owner"],
        allowImpersonatingAdmins: false,
        bannedUserMessage: "Esta conta está desativada. Fale com o dono do painel.",
      }),
      // Precisa ser o último: grava os cookies quando a chamada vem de uma Server Action.
      nextCookies(),
    ],
  });
}

export type AdminAuth = ReturnType<typeof createAdminAuth>;

let instance: AdminAuth | undefined;

/** Instância de admin do Better Auth, ou `undefined` sem banco ou sem ADMIN_AUTH_SECRET. */
export function getAdminAuth(): AdminAuth | undefined {
  if (instance) return instance;
  const db = getDb();
  const secret = getEnv().ADMIN_AUTH_SECRET;
  if (!db || !secret) return undefined;
  instance = createAdminAuth(db, secret);
  return instance;
}

/** Só para testes: instância com banco e segredo explícitos. */
export function createAdminAuthForTests(db: Database, secret: string): AdminAuth {
  return createAdminAuth(db, secret);
}
