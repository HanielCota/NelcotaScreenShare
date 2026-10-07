import { defineConfig } from "drizzle-kit";

/**
 * `pnpm db:generate` creates the SQL migration in `drizzle/` from the schema;
 * `pnpm db:migrate` (or the deploy job) applies the pending ones. Never at app boot.
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./server/db/schema/index.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
  strict: true,
  verbose: true,
});
