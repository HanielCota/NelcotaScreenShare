import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { defineConfig, devices } from "@playwright/test";
import { E2E_ACCESS_PASSWORD, E2E_PORT, E2E_URL } from "./tests/e2e/support/env";

/**
 * E2E dos fluxos críticos (docs/refactor/04-plano-de-migracao.md §1).
 * Precisa do Postgres e do LiveKit de desenvolvimento (README → "Desenvolvimento").
 * O app sobe na porta 3100 com um banco próprio (nelcota_e2e), recriado a cada execução.
 */
const local = existsSync(".env.local") ? parseEnv(readFileSync(".env.local", "utf8")) : {};
const env = { ...local, ...process.env };
// O global-setup (mesmo processo) recria o banco do E2E a partir desta URL.
process.env.TEST_DATABASE_URL ??= local.TEST_DATABASE_URL;

function e2eDatabaseUrl(): string {
  const base = env.TEST_DATABASE_URL;
  if (!base) throw new Error("Defina TEST_DATABASE_URL (Postgres de testes) para rodar o E2E.");
  const url = new URL(base);
  url.pathname = "/nelcota_e2e";
  return url.toString();
}

export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "tests/e2e/global-setup.ts",
  // Salas reais no LiveKit: um teste por vez deixa o resultado previsível.
  workers: 1,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: E2E_URL,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    trace: "retain-on-failure",
    permissions: ["microphone"],
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: {
          args: [
            // Microfone e tela falsos, sem diálogo de permissão.
            "--use-fake-ui-for-media-stream",
            "--use-fake-device-for-media-stream",
            "--auto-select-desktop-capture-source=Entire screen",
          ],
        },
      },
    },
  ],
  webServer: {
    command: process.env.CI
      ? `pnpm build && pnpm start --port ${E2E_PORT}`
      : `pnpm dev --port ${E2E_PORT}`,
    url: `${E2E_URL}/api/health`,
    timeout: 240_000,
    reuseExistingServer: false,
    stdout: "ignore",
    stderr: "pipe",
    env: {
      DATABASE_URL: e2eDatabaseUrl(),
      APP_URL: E2E_URL,
      AUTH_SECRET: "segredo-participantes-e2e-0123456789abcdef0123",
      ADMIN_AUTH_SECRET: "segredo-admin-e2e-0123456789abcdef0123456789",
      LIVEKIT_API_KEY: env.LIVEKIT_API_KEY ?? "devkey",
      LIVEKIT_API_SECRET: env.LIVEKIT_API_SECRET ?? "devsecret-0123456789abcdef0123456789abcdef",
      NEXT_PUBLIC_LIVEKIT_URL: env.NEXT_PUBLIC_LIVEKIT_URL ?? "ws://127.0.0.1:7880",
      ACCESS_PASSWORD: E2E_ACCESS_PASSWORD,
      MAX_PARTICIPANTS: "5",
      REQUIRE_EMAIL_VERIFICATION: "false",
      LOG_LEVEL: "warn",
    },
  },
});
