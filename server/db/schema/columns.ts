import { sql } from "drizzle-orm";
import { timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Colunas padrão (docs/PLANO-ADMIN.md §4.1): UUID v7 gerado pelo Postgres 18,
 * timestamptz em UTC e `updated_at` mantido por trigger (`set_updated_at`).
 */
export const id = () =>
  uuid("id")
    .primaryKey()
    .default(sql`uuidv7()`);

export const timestamptz = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

export const createdAt = () => timestamptz("created_at").notNull().defaultNow();
export const updatedAt = () => timestamptz("updated_at").notNull().defaultNow();
