import { getDb, type Database } from "@/server/db/index.server";

/** The app's connection for a CLI script; without DATABASE_URL it exits with a hint. */
export function openDb(): Database {
  try {
    return getDb();
  } catch {
    console.error("Set DATABASE_URL.");
    process.exit(1);
  }
}
