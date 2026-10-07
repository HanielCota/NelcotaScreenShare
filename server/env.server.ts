import { z } from "zod";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

// Postgres: accounts, rooms and settings. Use the role without DDL (nelcota_app).
const databaseUrlSchema = z.url({
  protocol: /^postgres(ql)?$/,
  error: "DATABASE_URL é obrigatória (postgres:// ou postgresql://)",
});

// Public origin of the app (e-mail links, Better Auth CSRF). In dev: localhost.
const appUrlSchema = z.preprocess(emptyToUndefined, z.url().optional());

export const logLevelSchema = z.preprocess(
  emptyToUndefined,
  z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).optional(),
);

const envSchema = z
  .object({
    LIVEKIT_API_KEY: z.string({ error: "LIVEKIT_API_KEY é obrigatória" }).min(1),
    LIVEKIT_API_SECRET: z
      .string({ error: "LIVEKIT_API_SECRET é obrigatória" })
      .min(32, "LIVEKIT_API_SECRET precisa ter ao menos 32 caracteres"),
    LIVEKIT_URL: z.url({
      protocol: /^wss?$/,
      error: "LIVEKIT_URL precisa ser uma URL ws:// ou wss://",
    }),
    ACCESS_PASSWORD: z.preprocess(
      emptyToUndefined,
      z.string().min(8, "ACCESS_PASSWORD precisa ter ao menos 8 caracteres").optional(),
    ),
    MAX_PARTICIPANTS: z.preprocess(
      emptyToUndefined,
      z.coerce.number().int().min(2).max(8).default(6),
    ),
    // Participant e-mail confirmation. Disabled for now: the account
    // gets in right away, without the link. "true" requires the link again to join rooms.
    REQUIRE_EMAIL_VERIFICATION: z.preprocess(
      emptyToUndefined,
      z
        .enum(["true", "false"])
        .default("false")
        .transform((value) => value === "true"),
    ),
    // How many trusted proxies append IPs to X-Forwarded-For (Traefik = 1;
    // Cloudflare in front of Traefik = 2). Determines which IP the rate limit uses.
    TRUSTED_PROXY_HOPS: z.preprocess(
      emptyToUndefined,
      z.coerce.number().int().min(1).max(5).default(1),
    ),
    DATABASE_URL: databaseUrlSchema,
    // Secret of the Better Auth participant instance (cookies, encrypted 2FA).
    // Generate with: openssl rand -base64 48
    AUTH_SECRET: z
      .string({ error: "AUTH_SECRET é obrigatória (openssl rand -base64 48)" })
      .min(32, "AUTH_SECRET precisa ter ao menos 32 caracteres"),
    // Public origin of the app (e-mail links, Better Auth CSRF). In dev: localhost.
    APP_URL: appUrlSchema,
    // Secret of the Better Auth admin instance (cookies, encrypted 2FA). Without it,
    // /admin is disabled. Generate with: openssl rand -base64 48
    ADMIN_AUTH_SECRET: z.preprocess(
      emptyToUndefined,
      z.string().min(32, "ADMIN_AUTH_SECRET precisa ter ao menos 32 caracteres").optional(),
    ),
    // Transactional e-mail (invitations, password recovery, verification).
    // Without SMTP_URL in development, e-mails go to the log.
    SMTP_URL: z.preprocess(
      emptyToUndefined,
      z.url({ protocol: /^smtps?$/, error: "SMTP_URL precisa ser smtp:// ou smtps://" }).optional(),
    ),
    MAIL_FROM: z.preprocess(emptyToUndefined, z.string().min(3).optional()),
    // Optional observability. Only the public DSN is sent to the browser.
    SENTRY_DSN: z.preprocess(emptyToUndefined, z.url().optional()),
    PUBLIC_SENTRY_DSN: z.preprocess(emptyToUndefined, z.url().optional()),
    LOG_LEVEL: logLevelSchema,
    // Commit SHA, set by CI in the image (shows up in /api/ready and in Sentry).
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

/**
 * Public origin of the app (no trailing slash). Reads only APP_URL (validated by the same
 * rule as the full environment): create-owner builds the link without needing the rest.
 */
export function appUrl(): string {
  return (appUrlSchema.parse(process.env.APP_URL) ?? "http://localhost:3000").replace(/\/$/, "");
}

type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

/**
 * Reads and validates the environment variables at runtime (never inlined into the bundle).
 * The server entry calls this function on boot to fail early.
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
 * Only the database URL, validated by the same rule as the full environment. The scripts
 * (seed, create-owner) use the database without needing the LiveKit keys etc.
 */
export function databaseUrl(): string {
  const parsed = databaseUrlSchema.safeParse(process.env.DATABASE_URL);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "DATABASE_URL inválida");
  return parsed.data;
}

/**
 * Fails before accepting requests when required configuration is missing.
 * Coolify shows the error and does not mark the deploy as healthy.
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
