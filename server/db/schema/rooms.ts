import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  customType,
  index,
  inet,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  smallint,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { adminUsers } from "./admin-auth";
import { createdAt, id, timestamptz, updatedAt } from "./columns";
import { users } from "./user-auth";

const bytea = customType<{ data: Buffer }>({ dataType: () => "bytea" });

/**
 * Dados de negócio (docs/PLANO-ADMIN.md §4.3). Salas, participações e
 * compartilhamentos são projeções dos webhooks do LiveKit (`livekit_events`);
 * ver `server/livekit/projector.ts`.
 */
export const roomStatus = pgEnum("room_status", ["active", "finished"]);

/** Mesmo padrão de `roomCodeSchema` (lib/livekit.ts). */
export const ROOM_CODE_PATTERN = "^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$";

export const rooms = pgTable(
  "rooms",
  {
    id: id(),
    code: text("code").notNull(),
    status: roomStatus("status").notNull().default("active"),
    // sid da instância atual no LiveKit (muda quando a sala é reaberta).
    livekitSid: text("livekit_sid"),
    startedAt: timestamptz("started_at").notNull().defaultNow(),
    finishedAt: timestamptz("finished_at"),
    lastActivityAt: timestamptz("last_activity_at").notNull().defaultNow(),
    peakParticipants: smallint("peak_participants").notNull().default(0),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    closedByAdminId: uuid("closed_by_admin_id").references(() => adminUsers.id),
    note: text("note"),
    deletedAt: timestamptz("deleted_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check("rooms_code_check", sql.raw(`code ~ '${ROOM_CODE_PATTERN}'`)),
    check("rooms_note_check", sql`length(${t.note}) <= 500`),
    check("rooms_peak_check", sql`${t.peakParticipants} >= 0`),
    check(
      "rooms_finished_check",
      sql`${t.finishedAt} is null or ${t.finishedAt} >= ${t.startedAt}`,
    ),
    // O mesmo código pode ser reaberto: só uma sala "viva" (não excluída) por código.
    uniqueIndex("rooms_code_live_key")
      .on(t.code)
      .where(sql`${t.deletedAt} is null`),
    index("rooms_activity_idx")
      .on(t.status, t.lastActivityAt.desc(), t.id.desc())
      .where(sql`${t.deletedAt} is null`),
    index("rooms_code_search_idx")
      .using("gin", sql`${t.code} gin_trgm_ops`)
      .where(sql`${t.deletedAt} is null`),
    index("rooms_created_by_idx").on(t.createdByUserId),
  ],
);

export const leaveReason = pgEnum("participant_leave_reason", [
  "left",
  "disconnected",
  "removed_by_admin",
  "room_closed",
  "unknown",
]);

export const roomParticipations = pgTable(
  "room_participations",
  {
    id: id(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "restrict" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    // = users.id no token.
    livekitIdentity: text("livekit_identity").notNull(),
    // sid da conexão no LiveKit (PA_…): vem em todo evento do participante,
    // inclusive nos de faixa, que não trazem joined_at.
    livekitSid: text("livekit_sid").notNull(),
    // Anonimizável (LGPD, 12 meses).
    displayName: text("display_name"),
    // Registro de acesso (Marco Civil): vira NULL depois de 6 meses.
    ip: inet("ip"),
    joinedAt: timestamptz("joined_at").notNull(),
    leftAt: timestamptz("left_at"),
    leaveReason: leaveReason("leave_reason"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    // Uma linha por conexão: entrada, faixas e saída caem na mesma linha.
    uniqueIndex("room_participations_livekit_sid_key").on(t.livekitSid),
    check("room_participations_name_check", sql`length(${t.displayName}) <= 32`),
    check(
      "room_participations_left_check",
      sql`${t.leftAt} is null or ${t.leftAt} >= ${t.joinedAt}`,
    ),
    index("room_participations_room_idx").on(t.roomId, t.joinedAt.desc()),
    index("room_participations_user_idx").on(t.userId, t.joinedAt.desc()),
    index("room_participations_online_idx")
      .on(t.roomId)
      .where(sql`${t.leftAt} is null`),
  ],
);

export const shareSessions = pgTable(
  "share_sessions",
  {
    id: id(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "restrict" }),
    participationId: uuid("participation_id")
      .notNull()
      .references(() => roomParticipations.id, { onDelete: "restrict" }),
    trackSid: text("track_sid").notNull().unique(),
    withAudio: boolean("with_audio").notNull().default(false),
    startedAt: timestamptz("started_at").notNull(),
    endedAt: timestamptz("ended_at"),
    durationSeconds: integer("duration_seconds").generatedAlwaysAs(
      sql`CASE WHEN ended_at IS NULL THEN NULL ELSE floor(extract(epoch FROM ended_at - started_at))::int END`,
    ),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check(
      "share_sessions_ended_check",
      sql`${t.endedAt} is null or ${t.endedAt} >= ${t.startedAt}`,
    ),
    index("share_sessions_started_idx").on(t.startedAt.desc(), t.id.desc()),
    index("share_sessions_room_idx").on(t.roomId, t.startedAt.desc()),
    index("share_sessions_participation_idx").on(t.participationId),
    index("share_sessions_active_idx")
      .on(t.roomId)
      .where(sql`${t.endedAt} is null`),
  ],
);

/** Convite com validade/limite de usos (telas na Fase 5). O token só existe como hash. */
export const roomInvites = pgTable(
  "room_invites",
  {
    id: id(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    tokenHash: bytea("token_hash").notNull().unique(),
    label: text("label"),
    maxUses: integer("max_uses"),
    uses: integer("uses").notNull().default(0),
    expiresAt: timestamptz("expires_at"),
    revokedAt: timestamptz("revoked_at"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => adminUsers.id),
    deletedAt: timestamptz("deleted_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check("room_invites_label_check", sql`length(${t.label}) <= 80`),
    check("room_invites_max_uses_check", sql`${t.maxUses} > 0`),
    check("room_invites_uses_check", sql`${t.uses} >= 0`),
    check("room_invites_limit_check", sql`${t.maxUses} is null or ${t.uses} <= ${t.maxUses}`),
    index("room_invites_room_idx").on(t.roomId, t.createdAt.desc()),
  ],
);

export const tokenResult = pgEnum("token_result", [
  "granted",
  "wrong_password",
  "room_full",
  "rate_limited",
  "blocked",
  "unverified",
  "unauthenticated",
  "invalid",
  "error",
]);

/** Cada pedido ao /api/token (só inserção; retenção de 6 meses). */
export const tokenRequests = pgTable(
  "token_requests",
  {
    id: id(),
    roomCode: text("room_code").notNull(),
    roomId: uuid("room_id").references(() => rooms.id, { onDelete: "set null" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    result: tokenResult("result").notNull(),
    ip: inet("ip"),
    createdAt: createdAt(),
  },
  (t) => [
    check("token_requests_room_code_check", sql`length(${t.roomCode}) <= 64`),
    index("token_requests_created_brin").using("brin", t.createdAt),
    index("token_requests_ip_idx").on(t.ip, t.createdAt.desc()),
    index("token_requests_user_idx").on(t.userId, t.roomCode, t.createdAt.desc()),
  ],
);

/** Webhook bruto: o id do evento garante idempotência; pendentes podem ser reprocessados. */
export const livekitEvents = pgTable(
  "livekit_events",
  {
    id: text("id").primaryKey(),
    event: text("event").notNull(),
    roomName: text("room_name"),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    // Momento do evento no LiveKit (ordena o reprocessamento).
    occurredAt: timestamptz("occurred_at").notNull(),
    receivedAt: timestamptz("received_at").notNull().defaultNow(),
    processedAt: timestamptz("processed_at"),
    error: text("error"),
  },
  (t) => [
    index("livekit_events_pending_idx")
      .on(t.occurredAt)
      .where(sql`${t.processedAt} is null`),
    index("livekit_events_received_idx").on(t.receivedAt.desc()),
  ],
);
