import { defineConfig } from "drizzle-kit";

/**
 * `pnpm db:generate` cria a migração SQL em `drizzle/` a partir do schema;
 * `pnpm db:migrate` (ou o job de deploy) aplica as pendentes. Nunca no boot do app.
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./server/db/schema/index.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
  strict: true,
  verbose: true,
});
