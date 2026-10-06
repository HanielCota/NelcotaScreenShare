import { runMigrations } from "../../scripts/migrate";
import { adminQuery, ident, testDatabases } from "./db";

/**
 * Uma vez por execução: recria o banco-modelo e aplica todas as migrações nele.
 * Testa de quebra que as migrações sobem do zero.
 */
export default async function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) return;
  const { adminUrl, template, templateUrl } = testDatabases(url);
  await adminQuery(adminUrl, [
    `DROP DATABASE IF EXISTS ${ident(template)} WITH (FORCE)`,
    `CREATE DATABASE ${ident(template)}`,
  ]);
  await runMigrations(templateUrl);
}
