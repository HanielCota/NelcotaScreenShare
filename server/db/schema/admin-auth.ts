import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { ADMIN_ROLES } from "@/features/auth/domain/roles";
import { createdAt, id, timestamptz, updatedAt } from "./columns";

/**
 * Tables of the Better Auth admin instance (`/api/admin/auth`). The TypeScript
 * keys follow Better Auth's field names; the columns are snake_case.
 * See `server/auth/admin.ts` (modelName of each table).
 */
const roleList = sql.raw(ADMIN_ROLES.map((role) => `'${role}'`).join(", "));

export const adminUsers = pgTable(
  "admin_users",
  {
    id: id(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
    // Admin plugin: role and deactivation (banned = account deactivated by the owner).
    role: text("role").notNull().default("viewer"),
    banned: boolean("banned").notNull().default(false),
    banReason: text("ban_reason"),
    banExpires: timestamptz("ban_expires"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("admin_users_email_key").on(sql`lower(${t.email})`),
    check("admin_users_role_check", sql`${t.role} in (${roleList})`),
    check("admin_users_name_check", sql`length(${t.name}) between 1 and 80`),
  ],
);

export const adminSessions = pgTable(
  "admin_sessions",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => adminUsers.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamptz("expires_at").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    // Admin plugin. Impersonation is disabled, but the field is part of the schema.
    impersonatedBy: uuid("impersonated_by"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("admin_sessions_user_id_idx").on(t.userId, t.expiresAt.desc())],
);

export const adminAccounts = pgTable(
  "admin_accounts",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => adminUsers.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    // argon2id hash (provider "credential"). The OAuth fields stay empty.
    password: text("password"),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamptz("access_token_expires_at"),
    refreshTokenExpiresAt: timestamptz("refresh_token_expires_at"),
    scope: text("scope"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("admin_accounts_provider_account_key").on(t.providerId, t.accountId),
    index("admin_accounts_user_id_idx").on(t.userId),
  ],
);

export const adminVerifications = pgTable(
  "admin_verifications",
  {
    id: id(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamptz("expires_at").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("admin_verifications_identifier_idx").on(t.identifier)],
);

export const adminTwoFactors = pgTable(
  "admin_two_factors",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => adminUsers.id, { onDelete: "cascade" }),
    // Encrypted by Better Auth with the instance secret.
    secret: text("secret").notNull(),
    backupCodes: text("backup_codes").notNull(),
    verified: boolean("verified").notNull().default(true),
    failedVerificationCount: integer("failed_verification_count").notNull().default(0),
    lockedUntil: timestamptz("locked_until"),
  },
  (t) => [index("admin_two_factors_user_id_idx").on(t.userId)],
);

export const adminRateLimits = pgTable("admin_rate_limits", {
  id: id(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});

export const inviteStatus = pgEnum("invite_status", ["pending", "accepted", "revoked", "expired"]);

/**
 * Admin invitation (public sign-up is disabled). The token only exists in the link
 * that was sent; its SHA-256 is stored here. Null `invited_by` = invitation from the bootstrap script.
 */
export const adminInvitations = pgTable(
  "admin_invitations",
  {
    id: id(),
    email: text("email").notNull(),
    role: text("role").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    status: inviteStatus("status").notNull().default("pending"),
    invitedBy: uuid("invited_by").references(() => adminUsers.id, { onDelete: "restrict" }),
    expiresAt: timestamptz("expires_at").notNull(),
    acceptedAt: timestamptz("accepted_at"),
    acceptedUserId: uuid("accepted_user_id").references(() => adminUsers.id, {
      onDelete: "restrict",
    }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("admin_invitations_pending_email_key")
      .on(sql`lower(${t.email})`)
      .where(sql`${t.status} = 'pending'`),
    check("admin_invitations_role_check", sql`${t.role} in (${roleList})`),
    check("admin_invitations_expiry_check", sql`${t.expiresAt} > ${t.createdAt}`),
  ],
);
