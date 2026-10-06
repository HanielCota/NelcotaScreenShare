import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Configurações do app editadas pelo /admin, uma linha por grupo ("mascot", …).
 * O valor é JSON validado por Zod em `server/settings.ts`: grupo novo não pede migração.
 */
export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
