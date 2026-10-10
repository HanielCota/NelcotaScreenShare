import { getDb, type Database } from "@/server/db/index.server";

/** The app's connection for a CLI script; without DATABASE_URL it exits with a hint. */
export function openDb(): Database {
  try {
    return getDb();
  } catch (error) {
    console.error("Could not open the database. Set DATABASE_URL.");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
