import { runMigrations } from "../../scripts/migrate";
import { adminQuery, ident } from "../integration/db";

/** Banco do E2E recriado do zero a cada execução (as migrações também são testadas). */
export default async function setup() {
  const base = process.env.TEST_DATABASE_URL;
  if (!base) throw new Error("Defina TEST_DATABASE_URL para rodar o E2E.");
  const admin = new URL(base);
  const e2e = new URL(base);
  e2e.pathname = "/nelcota_e2e";
  await adminQuery(admin.toString(), [
    `DROP DATABASE IF EXISTS ${ident("nelcota_e2e")} WITH (FORCE)`,
    `CREATE DATABASE ${ident("nelcota_e2e")}`,
  ]);
  await runMigrations(e2e.toString());
}
