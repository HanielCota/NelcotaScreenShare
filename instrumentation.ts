export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateEnvOnBoot } = await import("@/lib/env");
    validateEnvOnBoot();
  }
}
