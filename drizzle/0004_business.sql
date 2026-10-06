CREATE TYPE "public"."participant_leave_reason" AS ENUM('left', 'disconnected', 'removed_by_admin', 'room_closed', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."room_status" AS ENUM('active', 'finished');--> statement-breakpoint
CREATE TYPE "public"."token_result" AS ENUM('granted', 'wrong_password', 'room_full', 'rate_limited', 'blocked', 'unverified', 'unauthenticated', 'invalid', 'error');--> statement-breakpoint
CREATE TABLE "livekit_events" (
	"id" text PRIMARY KEY NOT NULL,
	"event" text NOT NULL,
	"room_name" text,
	"payload" jsonb NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "room_invites" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"room_id" uuid NOT NULL,
	"token_hash" "bytea" NOT NULL,
	"label" text,
	"max_uses" integer,
	"uses" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_by" uuid NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "room_invites_token_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "room_invites_label_check" CHECK (length("room_invites"."label") <= 80),
	CONSTRAINT "room_invites_max_uses_check" CHECK ("room_invites"."max_uses" > 0),
	CONSTRAINT "room_invites_uses_check" CHECK ("room_invites"."uses" >= 0),
	CONSTRAINT "room_invites_limit_check" CHECK ("room_invites"."max_uses" is null or "room_invites"."uses" <= "room_invites"."max_uses")
);
--> statement-breakpoint
CREATE TABLE "room_participations" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"room_id" uuid NOT NULL,
	"user_id" uuid,
	"livekit_identity" text NOT NULL,
	"livekit_sid" text NOT NULL,
	"display_name" text,
	"ip" "inet",
	"joined_at" timestamp with time zone NOT NULL,
	"left_at" timestamp with time zone,
	"leave_reason" "participant_leave_reason",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "room_participations_name_check" CHECK (length("room_participations"."display_name") <= 32),
	CONSTRAINT "room_participations_left_check" CHECK ("room_participations"."left_at" is null or "room_participations"."left_at" >= "room_participations"."joined_at")
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"code" text NOT NULL,
	"status" "room_status" DEFAULT 'active' NOT NULL,
	"livekit_sid" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"last_activity_at" timestamp with time zone DEFAULT now() NOT NULL,
	"peak_participants" smallint DEFAULT 0 NOT NULL,
	"created_by_user_id" uuid,
	"closed_by_admin_id" uuid,
	"note" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rooms_code_check" CHECK (code ~ '^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$'),
	CONSTRAINT "rooms_note_check" CHECK (length("rooms"."note") <= 500),
	CONSTRAINT "rooms_peak_check" CHECK ("rooms"."peak_participants" >= 0),
	CONSTRAINT "rooms_finished_check" CHECK ("rooms"."finished_at" is null or "rooms"."finished_at" >= "rooms"."started_at")
);
--> statement-breakpoint
CREATE TABLE "share_sessions" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"room_id" uuid NOT NULL,
	"participation_id" uuid NOT NULL,
	"track_sid" text NOT NULL,
	"with_audio" boolean DEFAULT false NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"duration_seconds" integer GENERATED ALWAYS AS (CASE WHEN ended_at IS NULL THEN NULL ELSE floor(extract(epoch FROM ended_at - started_at))::int END) STORED,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "share_sessions_track_sid_unique" UNIQUE("track_sid"),
	CONSTRAINT "share_sessions_ended_check" CHECK ("share_sessions"."ended_at" is null or "share_sessions"."ended_at" >= "share_sessions"."started_at")
);
--> statement-breakpoint
CREATE TABLE "token_requests" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"room_code" text NOT NULL,
	"room_id" uuid,
	"user_id" uuid,
	"result" "token_result" NOT NULL,
	"ip" "inet",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "token_requests_room_code_check" CHECK (length("token_requests"."room_code") <= 64)
);
--> statement-breakpoint
ALTER TABLE "room_invites" ADD CONSTRAINT "room_invites_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_invites" ADD CONSTRAINT "room_invites_created_by_admin_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_participations" ADD CONSTRAINT "room_participations_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_participations" ADD CONSTRAINT "room_participations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_closed_by_admin_id_admin_users_id_fk" FOREIGN KEY ("closed_by_admin_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_sessions" ADD CONSTRAINT "share_sessions_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_sessions" ADD CONSTRAINT "share_sessions_participation_id_room_participations_id_fk" FOREIGN KEY ("participation_id") REFERENCES "public"."room_participations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "token_requests" ADD CONSTRAINT "token_requests_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "token_requests" ADD CONSTRAINT "token_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "livekit_events_pending_idx" ON "livekit_events" USING btree ("occurred_at") WHERE "livekit_events"."processed_at" is null;--> statement-breakpoint
CREATE INDEX "livekit_events_received_idx" ON "livekit_events" USING btree ("received_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "room_invites_room_idx" ON "room_invites" USING btree ("room_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "room_participations_livekit_sid_key" ON "room_participations" USING btree ("livekit_sid");--> statement-breakpoint
CREATE INDEX "room_participations_room_idx" ON "room_participations" USING btree ("room_id","joined_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "room_participations_user_idx" ON "room_participations" USING btree ("user_id","joined_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "room_participations_online_idx" ON "room_participations" USING btree ("room_id") WHERE "room_participations"."left_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "rooms_code_live_key" ON "rooms" USING btree ("code") WHERE "rooms"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "rooms_activity_idx" ON "rooms" USING btree ("status","last_activity_at" DESC NULLS LAST,"id" DESC NULLS LAST) WHERE "rooms"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "rooms_code_search_idx" ON "rooms" USING gin ("code" gin_trgm_ops) WHERE "rooms"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "rooms_created_by_idx" ON "rooms" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "share_sessions_started_idx" ON "share_sessions" USING btree ("started_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "share_sessions_room_idx" ON "share_sessions" USING btree ("room_id","started_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "share_sessions_participation_idx" ON "share_sessions" USING btree ("participation_id");--> statement-breakpoint
CREATE INDEX "share_sessions_active_idx" ON "share_sessions" USING btree ("room_id") WHERE "share_sessions"."ended_at" is null;--> statement-breakpoint
CREATE INDEX "token_requests_created_brin" ON "token_requests" USING brin ("created_at");--> statement-breakpoint
CREATE INDEX "token_requests_ip_idx" ON "token_requests" USING btree ("ip","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "token_requests_user_idx" ON "token_requests" USING btree ("user_id","room_code","created_at" DESC NULLS LAST);--> statement-breakpoint
-- ===== Escrito à mão: updated_at e tabelas só de inserção =====
CREATE TRIGGER rooms_set_updated_at BEFORE UPDATE ON rooms
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER room_participations_set_updated_at BEFORE UPDATE ON room_participations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER share_sessions_set_updated_at BEFORE UPDATE ON share_sessions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER room_invites_set_updated_at BEFORE UPDATE ON room_invites
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
-- token_requests: o app só insere e lê (DELETE fica para a retenção de 6 meses).
-- livekit_events: só insere, lê e marca processed_at/error.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nelcota_app') THEN
    REVOKE UPDATE, TRUNCATE ON token_requests FROM nelcota_app;
    REVOKE UPDATE, TRUNCATE ON livekit_events FROM nelcota_app;
    GRANT UPDATE (processed_at, error) ON livekit_events TO nelcota_app;
  END IF;
END $$;
