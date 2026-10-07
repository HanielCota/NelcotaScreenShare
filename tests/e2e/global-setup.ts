import { runMigrations } from "../../scripts/migrate";
import { adminQuery, ident } from "../integration/db";

/** E2E database recreated from scratch on every run (so migrations are tested too). */
export default async function setup() {
  const base = process.env.TEST_DATABASE_URL;
  if (!base) throw new Error("Set TEST_DATABASE_URL to run the E2E tests.");
  const admin = new URL(base);
  const e2e = new URL(base);
  e2e.pathname = "/nelcota_e2e";
  await adminQuery(admin.toString(), [
    `DROP DATABASE IF EXISTS ${ident("nelcota_e2e")} WITH (FORCE)`,
    `CREATE DATABASE ${ident("nelcota_e2e")}`,
  ]);
  await runMigrations(e2e.toString());
}
