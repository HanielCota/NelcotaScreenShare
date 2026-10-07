import "server-only";
import { eq } from "drizzle-orm";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { twoFactor } from "better-auth/plugins/two-factor";
import { CLIENT_IP_HEADER } from "@/server/client-ip";
import { getDb, type Database } from "@/server/db";
import {
  userAccounts,
  userRateLimits,
  users,
  userSessions,
  userTwoFactors,
  userVerifications,
} from "@/server/db/schema";
import { appUrl, getEnv } from "@/server/env";
import { logger } from "@/server/logger";
import { mailLayout, sendMail } from "@/server/mail";
import { hashPassword, PASSWORD_LIMITS, verifyPassword } from "./password";
import { AUTH_RATE_LIMIT_RULES, authHooks, FRESH_SESSION_SECONDS } from "./shared";

export const USER_AUTH_BASE_PATH = "/api/auth";

/** E-mails de conta vão em segundo plano: o tempo de resposta não revela nada. */
function deliver(to: string, subject: string, content: ReturnType<typeof mailLayout>) {
  void sendMail({ to, subject, ...content }).catch((error: unknown) =>
    logger.error({ err: error, subject }, "falha ao enviar e-mail de conta"),
  );
}

function createUserAuth(db: Database, secret: string) {
  const production = process.env.NODE_ENV === "production";
  const verificationRequired = getEnv().REQUIRE_EMAIL_VERIFICATION;

  return betterAuth({
    appName: "Nelcota",
    baseURL: appUrl(),
    basePath: USER_AUTH_BASE_PATH,
    secret,
    trustedOrigins: [appUrl()],
    telemetry: { enabled: false },
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        users,
        userSessions,
        userAccounts,
        userVerifications,
        userTwoFactors,
        userRateLimits,
      },
    }),
    user: {
      modelName: "users",
      additionalFields: {
        lastSeenAt: { type: "date", required: false, input: false },
        blockedAt: { type: "date", required: false, input: false },
        blockReason: { type: "string", required: false, input: false },
        anonymizedAt: { type: "date", required: false, input: false },
        deletedAt: { type: "date", required: false, input: false },
      },
      // Trocar e-mail: link enviado ao NOVO endereço; vale depois de confirmar.
      changeEmail: {
        enabled: true,
        updateEmailWithoutVerification: false,
      },
    },
    account: { modelName: "userAccounts", accountLinking: { enabled: false } },
    verification: { modelName: "userVerifications" },
    session: {
      modelName: "userSessions",
      expiresIn: 30 * 24 * 60 * 60,
      updateAge: 24 * 60 * 60,
      // Trocar senha/e-mail e excluir a conta exigem login nos últimos 10 min.
      freshAge: FRESH_SESSION_SECONDS,
      cookieCache: { enabled: false },
    },
    emailAndPassword: {
      enabled: true,
      // Desligada por enquanto (REQUIRE_EMAIL_VERIFICATION): o cadastro já entra.
      requireEmailVerification: verificationRequired,
      minPasswordLength: PASSWORD_LIMITS.user.min,
      maxPasswordLength: PASSWORD_LIMITS.user.max,
      password: { hash: hashPassword, verify: verifyPassword },
      resetPasswordTokenExpiresIn: 30 * 60,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => {
        deliver(
          user.email,
          "Redefinir sua senha do Nelcota",
          mailLayout({
            title: "Redefinir senha",
            intro: `Olá, ${user.name}. Recebemos um pedido para redefinir sua senha. O link vale por 30 minutos e só pode ser usado uma vez.`,
            action: { label: "Definir nova senha", url },
            outro: "Se não foi você, ignore este e-mail: sua senha continua a mesma.",
          }),
        );
      },
      // Cadastro com e-mail já existente: a tela responde igual (sem enumeração)
      // e o dono do e-mail fica sabendo.
      onExistingUserSignUp: async ({ user }) => {
        deliver(
          user.email,
          "Alguém tentou criar uma conta com seu e-mail",
          mailLayout({
            title: "Você já tem uma conta no Nelcota",
            intro:
              "Alguém tentou criar uma nova conta com este e-mail. Se foi você, é só entrar com sua senha (ou redefini-la). Se não foi, pode ignorar.",
            action: { label: "Entrar no Nelcota", url: `${appUrl()}/entrar` },
          }),
        );
      },
    },
    emailVerification: {
      // Com a confirmação desligada, o link só sai quando a pessoa pede (em /conta).
      sendOnSignUp: verificationRequired,
      sendOnSignIn: verificationRequired,
      autoSignInAfterVerification: true,
      expiresIn: 24 * 60 * 60,
      sendVerificationEmail: async ({ user, url }) => {
        deliver(
          user.email,
          "Confirme seu e-mail no Nelcota",
          mailLayout({
            title: "Confirme seu e-mail",
            intro: `Olá, ${user.name}. Confirme seu e-mail para entrar em salas e compartilhar a tela. O link vale por 24 horas.`,
            action: { label: "Confirmar e-mail", url },
            outro: "Se você não criou uma conta no Nelcota, ignore este e-mail.",
          }),
        );
      },
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      modelName: "userRateLimits",
      window: 60,
      max: 100,
      customRules: {
        ...AUTH_RATE_LIMIT_RULES,
        "/sign-up/email": { window: 60 * 10, max: 5 },
        "/send-verification-email": { window: 60, max: 2 },
      },
    },
    advanced: {
      cookiePrefix: "nelcota",
      useSecureCookies: production,
      // Lax: links de e-mail e de convite de sala chegam com a sessão.
      defaultCookieAttributes: { sameSite: "lax", httpOnly: true, path: "/" },
      database: { generateId: false },
      ipAddress: { ipAddressHeaders: [CLIENT_IP_HEADER] },
    },
    databaseHooks: {
      session: {
        create: {
          // Conta bloqueada pelo painel ou excluída não abre sessão.
          before: async (session) => {
            const [user] = await db
              .select({ blockedAt: users.blockedAt, deletedAt: users.deletedAt })
              .from(users)
              .where(eq(users.id, session.userId));
            if (!user || user.blockedAt || user.deletedAt) return false;
          },
        },
      },
    },
    hooks: authHooks(db, secret, "user", { audit: false }),
    plugins: [
      twoFactor({
        issuer: "Nelcota",
        schema: { twoFactor: { modelName: "userTwoFactors" } },
        backupCodeOptions: { amount: 10, length: 10 },
      }),
      nextCookies(),
    ],
  });
}

export type UserAuth = ReturnType<typeof createUserAuth>;

let instance: UserAuth | undefined;

/** Instância de participantes do Better Auth. */
export function getUserAuth(): UserAuth {
  if (instance) return instance;
  const db = getDb();
  instance = createUserAuth(db, getEnv().AUTH_SECRET);
  return instance;
}

/** Só para testes. */
export function createUserAuthForTests(db: Database, secret: string): UserAuth {
  return createUserAuth(db, secret);
}
