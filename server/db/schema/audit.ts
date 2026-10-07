import { sql } from "drizzle-orm";
import { check, index, inet, jsonb, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { adminUsers } from "./admin-auth";
import { createdAt, id } from "./columns";
import { users } from "./user-auth";

/**
 * Audit log: every sensitive action (who, what, when, from where, before and after).
 * Insert-only: a trigger refuses UPDATE and only allows DELETE after 5 years
 * (retention); the app role has no UPDATE/DELETE on this table.
 */
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: id(),
    // At most one actor: admin, participant (self-service) or none (system).
    actorAdminId: uuid("actor_admin_id").references(() => adminUsers.id, { onDelete: "restrict" }),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "restrict" }),
    action: text("action").notNull(),
    resourceType: text("resource_type").notNull(),
    resourceId: text("resource_id"),
    // {"field": {"antes": x, "depois": y}}, with secrets masked.
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
