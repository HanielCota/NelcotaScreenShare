import { sql } from "drizzle-orm";
import { check, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";
import { createdAt, id } from "./columns";

/**
 * People who asked to hear when the Pro plan launches (landing page). Only the e-mail,
 * kept until the launch notice is sent; see the privacy notice.
 */
export const proInterests = pgTable(
  "pro_interests",
  {
    id: id(),
    email: text("email").notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("pro_interests_email_key").on(sql`lower(${table.email})`),
    check("pro_interests_email_check", sql`length(${table.email}) <= 254`),
  ],
);
