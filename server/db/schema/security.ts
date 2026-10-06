import { index, inet, pgEnum, pgTable, text } from "drizzle-orm/pg-core";
import { createdAt, id } from "./columns";

export const authScope = pgEnum("auth_scope", ["admin", "user"]);

/**
 * Senhas erradas, para o bloqueio por tentativas (o Better Auth só bloqueia o
 * 2FA). O e-mail fica como HMAC: não guarda e-mails de quem nem tem conta.
 * Retenção: 30 dias (job de limpeza).
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
