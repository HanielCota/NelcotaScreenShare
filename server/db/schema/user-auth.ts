import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { createdAt, id, timestamptz, updatedAt } from "./columns";

/**
 * Participant accounts: second Better Auth instance (`/api/auth`),
 * isolated from the admin accounts. TypeScript keys = Better Auth field
 * names; columns in snake_case. See `features/auth/server/participant-auth.server.ts`.
 */
export const users = pgTable(
  "users",
  {
    id: id(),
    // Name shown in the room.
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
    lastSeenAt: timestamptz("last_seen_at"),
    // Maintained by a trigger on room_participations (sorts the list without a COUNT per page).
    participationsCount: integer("participations_count").notNull().default(0),
    // Blocked from the panel: sign-in and joining rooms are refused.
    blockedAt: timestamptz("blocked_at"),
    blockReason: text("block_reason"),
    // LGPD: e-mail and name replaced with values without personal data.
    anonymizedAt: timestamptz("anonymized_at"),
    deletedAt: timestamptz("deleted_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("users_email_key").on(sql`lower(${table.email})`),
    check("users_name_check", sql`length(${table.name}) between 1 and 32`),
    check("users_block_reason_check", sql`length(${table.blockReason}) <= 300`),
    index("users_created_at_idx")
      .on(table.createdAt.desc(), table.id.desc())
      .where(sql`${table.deletedAt} is null`),
    index("users_last_seen_at_idx")
      .on(table.lastSeenAt.desc().nullsLast(), table.id.desc())
      .where(sql`${table.deletedAt} is null`),
    index("users_participations_idx")
      .on(table.participationsCount.desc(), table.id.desc())
      .where(sql`${table.deletedAt} is null`),
    index("users_search_idx")
      .using("gin", sql`f_unaccent(lower(${table.name} || ' ' || ${table.email})) gin_trgm_ops`)
      .where(sql`${table.deletedAt} is null`),
  ],
);

export const userSessions = pgTable(
  "user_sessions",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamptz("expires_at").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("user_sessions_user_id_idx").on(table.userId, table.expiresAt.desc())],
);

export const userAccounts = pgTable(
  "user_accounts",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
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
  (table) => [
    uniqueIndex("user_accounts_provider_account_key").on(table.providerId, table.accountId),
    index("user_accounts_user_id_idx").on(table.userId),
  ],
);

export const userVerifications = pgTable(
  "user_verifications",
  {
    id: id(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamptz("expires_at").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("user_verifications_identifier_idx").on(table.identifier)],
);

export const userTwoFactors = pgTable(
  "user_two_factors",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    secret: text("secret").notNull(),
    backupCodes: text("backup_codes").notNull(),
    verified: boolean("verified").notNull().default(true),
    failedVerificationCount: integer("failed_verification_count").notNull().default(0),
    lockedUntil: timestamptz("locked_until"),
  },
  (table) => [index("user_two_factors_user_id_idx").on(table.userId)],
);

export const userRateLimits = pgTable("user_rate_limits", {
  id: id(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});
