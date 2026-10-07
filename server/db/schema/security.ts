import { index, inet, pgEnum, pgTable, text } from "drizzle-orm/pg-core";
import { createdAt, id } from "./columns";

export const authScope = pgEnum("auth_scope", ["admin", "user"]);

/**
 * Wrong passwords, for the attempt-based lockout (Better Auth only locks
 * 2FA). The e-mail is stored as an HMAC: it does not keep e-mails of people without an account.
 * Retention: 30 days (cleanup job).
 */
export const loginFailures = pgTable(
  "login_failures",
  {
    id: id(),
    scope: authScope("scope").notNull(),
    emailHash: text("email_hash").notNull(),
    ip: inet("ip"),
    createdAt: createdAt(),
  },
  (t) => [
    index("login_failures_email_idx").on(t.scope, t.emailHash, t.createdAt.desc()),
    index("login_failures_ip_idx").on(t.scope, t.ip, t.createdAt.desc()),
  ],
);
