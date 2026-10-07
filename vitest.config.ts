import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL("./", import.meta.url));

// Do .env.local só interessa o banco de testes; o resto do ambiente local não
// pode influenciar os testes (eles definem as próprias variáveis).
if (!process.env.TEST_DATABASE_URL && existsSync(`${root}.env.local`)) {
  const local = parseEnv(readFileSync(`${root}.env.local`, "utf8"));
  if (local.TEST_DATABASE_URL) process.env.TEST_DATABASE_URL = local.TEST_DATABASE_URL;
}

if (!process.env.TEST_DATABASE_URL) {
  // Sem o banco de testes, a integração não roda: avisa em vez de sumir calada.
  console.warn("[vitest] TEST_DATABASE_URL ausente: só os testes unitários vão rodar.");
}

/**
 * Dois projetos:
 * - `unit`: sem banco, sempre roda.
 * - `integration`: Postgres real. Só entra com TEST_DATABASE_URL (um banco
 *   descartável); cada arquivo recebe uma cópia limpa de um banco-modelo migrado.
 */
export default defineConfig({
  resolve: {
    alias: [{ find: /^@\//, replacement: root }],
  },
  test: {
    // Logs só atrapalham a saída dos testes (os espiões do logger continuam valendo).
    env: { LOG_LEVEL: "silent" },
    restoreMocks: true,
    unstubEnvs: true,
    projects: [
      {
        extends: true,
        test: { name: "unit", include: ["tests/unit/**/*.test.ts"], environment: "node" },
      },
      ...(process.env.TEST_DATABASE_URL
        ? [
            {
              extends: true,
              test: {
                name: "integration",
                include: ["tests/integration/**/*.test.ts"],
                environment: "node",
                globalSetup: ["tests/integration/global-setup.ts"],
                setupFiles: ["tests/integration/file-setup.ts"],
                testTimeout: 20_000,
                hookTimeout: 60_000,
              },
            },
          ]
        : []),
    ],
    coverage: {
      provider: "v8",
      include: ["server/**", "features/**", "lib/**", "components/**", "app/routes/api/**"],
      exclude: ["components/ui/**"],
      reporter: ["text-summary", "html", "json-summary"],
      // Catraca: o mínimo só sobe. Valores do baseline da refatoração (unit + integração).
      thresholds: { statements: 34, branches: 29, functions: 28, lines: 35 },
    },
  },
});
