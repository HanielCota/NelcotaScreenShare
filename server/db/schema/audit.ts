import { sql } from "drizzle-orm";
import { check, index, inet, jsonb, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { adminUsers } from "./admin-auth";
import { createdAt, id } from "./columns";
import { users } from "./user-auth";

/**
 * Audit log: toda ação sensível (quem, o quê, quando, de onde, antes e depois).
 * Só de inserção: trigger recusa UPDATE e só permite DELETE depois de 5 anos
 * (retenção); o papel do app não tem UPDATE/DELETE nesta tabela.
 */
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: id(),
    // No máximo um autor: admin, participante (autoatendimento) ou nenhum (sistema).
    actorAdminId: uuid("actor_admin_id").references(() => adminUsers.id, { onDelete: "restrict" }),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "restrict" }),
    action: text("action").notNull(),
    resourceType: text("resource_type").notNull(),
    resourceId: text("resource_id"),
    // {"campo": {"antes": x, "depois": y}}, com segredos mascarados.
    changes: jsonb("changes").$type<Record<string, { antes: unknown; depois: unknown }>>(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    ip: inet("ip"),
    userAgent: text("user_agent"),
    requestId: text("request_id"),
    createdAt: createdAt(),
  },
  (t) => [
    check("audit_logs_action_check", sql`${t.action} ~ '^[a-z][a-z_]*\\.[a-z][a-z_]*$'`),
    check(
      "audit_logs_single_actor_check",
      sql`num_nonnulls(${t.actorAdminId}, ${t.actorUserId}) <= 1`,
    ),
    index("audit_logs_created_at_idx").on(t.createdAt.desc(), t.id.desc()),
    index("audit_logs_actor_admin_idx").on(t.actorAdminId, t.createdAt.desc()),
    index("audit_logs_actor_user_idx").on(t.actorUserId, t.createdAt.desc()),
    index("audit_logs_resource_idx").on(t.resourceType, t.resourceId, t.createdAt.desc()),
    index("audit_logs_action_idx").on(t.action, t.createdAt.desc()),
    index("audit_logs_request_id_idx").on(t.requestId),
  ],
);
