import "server-only";
import { z } from "zod";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const envSchema = z
  .object({
    LIVEKIT_API_KEY: z.string({ error: "LIVEKIT_API_KEY é obrigatória" }).min(1),
    LIVEKIT_API_SECRET: z
      .string({ error: "LIVEKIT_API_SECRET é obrigatória" })
      .min(32, "LIVEKIT_API_SECRET precisa ter ao menos 32 caracteres"),
    NEXT_PUBLIC_LIVEKIT_URL: z.url({
      protocol: /^wss?$/,
      error: "NEXT_PUBLIC_LIVEKIT_URL precisa ser uma URL ws:// ou wss://",
    }),
    ACCESS_PASSWORD: z.preprocess(
      emptyToUndefined,
      z.string().min(8, "ACCESS_PASSWORD precisa ter ao menos 8 caracteres").optional(),
    ),
    MAX_PARTICIPANTS: z.preprocess(
      emptyToUndefined,
      z.coerce.number().int().min(2).max(8).default(6),
    ),
    // Confirmação de e-mail dos participantes. Desligada por enquanto: a conta
    // entra na hora, sem o link. "true" volta a exigir o link para entrar em salas.
    REQUIRE_EMAIL_VERIFICATION: z.preprocess(
      emptyToUndefined,
      z
        .enum(["true", "false"])
        .default("false")
        .transform((value) => value === "true"),
    ),
    // Quantos proxies confiáveis acrescentam IPs ao X-Forwarded-For (Traefik = 1;
    // Cloudflare na frente do Traefik = 2). Define qual IP o rate limit usa.
    TRUSTED_PROXY_HOPS: z.preprocess(
      emptyToUndefined,
      z.coerce.number().int().min(1).max(5).default(1),
    ),
    // Postgres: contas, salas e configurações. Use o papel sem DDL (nelcota_app).
    DATABASE_URL: z.url({
      protocol: /^postgres(ql)?$/,
      error: "DATABASE_URL é obrigatória (postgres:// ou postgresql://)",
    }),
    // Segredo da instância de participantes do Better Auth (cookies, 2FA cifrado).
    // Gere com: openssl rand -base64 48
    AUTH_SECRET: z
      .string({ error: "AUTH_SECRET é obrigatória (openssl rand -base64 48)" })
      .min(32, "AUTH_SECRET precisa ter ao menos 32 caracteres"),
    // Origem pública do app (links de e-mail, CSRF do Better Auth). Em dev: localhost.
    APP_URL: z.preprocess(emptyToUndefined, z.url().optional()),
    // Segredo da instância de admin do Better Auth (cookies, 2FA cifrado). Sem ele,
    // o /admin fica desligado. Gere com: openssl rand -base64 48
    ADMIN_AUTH_SECRET: z.preprocess(
      emptyToUndefined,
      z.string().min(32, "ADMIN_AUTH_SECRET precisa ter ao menos 32 caracteres").optional(),
    ),
    // E-mail transacional (convites, recuperação de senha, verificação).
    // Sem SMTP_URL em desenvolvimento, os e-mails vão para o log.
    SMTP_URL: z.preprocess(
      emptyToUndefined,
      z.url({ protocol: /^smtps?$/, error: "SMTP_URL precisa ser smtp:// ou smtps://" }).optional(),
    ),
    MAIL_FROM: z.preprocess(emptyToUndefined, z.string().min(3).optional()),
    // Observabilidade (opcionais). SENTRY_DSN liga o Sentry no servidor; o do
    // navegador vem de NEXT_PUBLIC_SENTRY_DSN no build.
    SENTRY_DSN: z.preprocess(emptyToUndefined, z.url().optional()),
    LOG_LEVEL: z.preprocess(
      emptyToUndefined,
      z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).optional(),
    ),
    // SHA do commit, definido pelo CI na imagem (aparece no /api/ready e no Sentry).
    APP_VERSION: z.preprocess(emptyToUndefined, z.string().max(64).optional()),
  })
  .superRefine((env, ctx) => {
    if (process.env.NODE_ENV !== "production") return;
    if (!env.APP_URL) {
      ctx.addIssue({
        code: "custom",
        path: ["APP_URL"],
        message: "Defina APP_URL (ex.: https://app.seudominio.com) para os links de e-mail",
      });
    }
    if (!env.SMTP_URL || !env.MAIL_FROM) {
      ctx.addIssue({
        code: "custom",
        path: ["SMTP_URL"],
        message:
          "Em produção, verificação de e-mail e recuperação de senha exigem SMTP_URL e MAIL_FROM",
      });
    }
    if (env.ADMIN_AUTH_SECRET && env.ADMIN_AUTH_SECRET === env.AUTH_SECRET) {
      ctx.addIssue({
        code: "custom",
        path: ["ADMIN_AUTH_SECRET"],
        message: "Use segredos diferentes para o painel admin e para as contas de participantes",
      });
    }
  });

/** Origem pública do app (sem barra no fim). */
export function appUrl(): string {
  return (getEnv().APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

/**
 * Lê e valida as variáveis de ambiente em runtime (nunca inlinadas no bundle).
 * `instrumentation.ts` chama esta função no boot para falhar cedo.
 */
export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Variáveis de ambiente inválidas:\n${details}`);
  }
  cached = parsed.data;
  return cached;
}

/**
 * Chamado pelo `instrumentation.ts` no boot. O Next apenas registra erros do
 * instrumentation e segue servindo; em produção queremos que o container falhe
 * (o Coolify mostra o erro e não marca o deploy como saudável).
 */
export function validateEnvOnBoot(): void {
  try {
    getEnv();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    if (process.env.NODE_ENV === "production") process.exit(1);
    throw error;
  }
}
