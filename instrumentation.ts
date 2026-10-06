import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateEnvOnBoot } = await import("@/server/env");
    validateEnvOnBoot();
    // Migrações não rodam aqui: são um job separado do deploy (scripts/migrate.ts).

    if (process.env.SENTRY_DSN) {
      const { sentryOptions } = await import("@/server/sentry");
      Sentry.init(sentryOptions(process.env.SENTRY_DSN));
    }
  }
}

// Erros de Server Components, actions e Route Handlers (sem efeito sem SENTRY_DSN).
export const onRequestError = Sentry.captureRequestError;
