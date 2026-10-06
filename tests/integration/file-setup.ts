import { adminQuery, ident, testDatabases } from "./db";

/**
 * Antes de cada arquivo de teste: cópia limpa do banco-modelo para este worker
 * (CREATE DATABASE … TEMPLATE é rápido e isola os arquivos entre si).
 */
const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error("Testes de integração precisam de TEST_DATABASE_URL");

const { adminUrl, template, worker, workerUrl } = testDatabases(
  url,
  process.env.VITEST_POOL_ID ?? "0",
);
await adminQuery(adminUrl, [
  `DROP DATABASE IF EXISTS ${ident(worker)} WITH (FORCE)`,
  `CREATE DATABASE ${ident(worker)} TEMPLATE ${ident(template)}`,
]);

// O código do app lê o banco e as chaves daqui.
Object.assign(process.env, {
  DATABASE_URL: workerUrl,
  LIVEKIT_API_KEY: "chave-teste",
  LIVEKIT_API_SECRET: "segredo-de-teste-0123456789abcdef0123456789",
  NEXT_PUBLIC_LIVEKIT_URL: "ws://127.0.0.1:7880",
});
