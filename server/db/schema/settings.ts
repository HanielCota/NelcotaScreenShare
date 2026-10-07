import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { adminUsers } from "./admin-auth";

/**
 * Configurações do app editadas pelo /admin, uma linha por grupo ("mascot", …).
 * O valor é JSON validado por Zod em `features/admin/settings/server/settings.server.ts`: grupo novo não pede migração.
 */
export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedBy: uuid("updated_by").references(() => adminUsers.id, { onDelete: "restrict" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
