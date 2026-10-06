import { defineConfig } from "drizzle-kit";

/**
 * `pnpm db:generate` cria a migração SQL em `drizzle/` a partir do schema;
 * o app aplica as pendentes sozinho no boot (`instrumentation.ts`).
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./server/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
  strict: true,
  verbose: true,
});
