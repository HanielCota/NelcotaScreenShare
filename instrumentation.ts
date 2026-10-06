export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getEnv, validateEnvOnBoot } = await import("@/lib/env");
    validateEnvOnBoot();

    const url = getEnv().DATABASE_URL;
    if (url) {
      const { runMigrations } = await import("@/lib/db/migrate");
      try {
        await runMigrations(url);
      } catch (error) {
        console.error("[db] falha ao aplicar migrações", error);
        // Mesmo critério do env: em produção o container falha e o Coolify mostra o erro.
        if (process.env.NODE_ENV === "production") process.exit(1);
      }
    }
  }
}
