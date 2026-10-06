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
    // Quantos proxies confiáveis acrescentam IPs ao X-Forwarded-For (Traefik = 1;
    // Cloudflare na frente do Traefik = 2). Define qual IP o rate limit usa.
    TRUSTED_PROXY_HOPS: z.preprocess(
      emptyToUndefined,
      z.coerce.number().int().min(1).max(5).default(1),
    ),
    // Postgres (configurações do admin e o que vier depois). Sem ele, o app roda
    // com os valores padrão e o admin não consegue salvar.
    DATABASE_URL: z.preprocess(
      emptyToUndefined,
      z
        .url({
          protocol: /^postgres(ql)?$/,
          error: "DATABASE_URL precisa ser uma URL postgres:// ou postgresql://",
        })
        .optional(),
    ),
    // Painel /admin: só liga com as duas definidas.
    ADMIN_PASSWORD: z.preprocess(
      emptyToUndefined,
      z.string().min(12, "ADMIN_PASSWORD precisa ter ao menos 12 caracteres").optional(),
    ),
    // Assina o cookie de sessão do admin. Separado da senha: vazar o cookie não
    // permite descobrir a senha por força bruta.
    ADMIN_SESSION_SECRET: z.preprocess(
      emptyToUndefined,
      z.string().min(32, "ADMIN_SESSION_SECRET precisa ter ao menos 32 caracteres").optional(),
    ),
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
    if (Boolean(env.ADMIN_PASSWORD) !== Boolean(env.ADMIN_SESSION_SECRET)) {
      ctx.addIssue({
        code: "custom",
        path: [env.ADMIN_PASSWORD ? "ADMIN_SESSION_SECRET" : "ADMIN_PASSWORD"],
        message: "Para ligar o /admin, defina ADMIN_PASSWORD e ADMIN_SESSION_SECRET juntas",
      });
    }
  });

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
