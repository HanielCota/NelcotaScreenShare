ALTER TYPE "public"."token_result" ADD VALUE 'invite_invalid' BEFORE 'error';--> statement-breakpoint
CREATE TABLE "room_invite_uses" (
	"invite_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "room_invite_uses_invite_id_user_id_pk" PRIMARY KEY("invite_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "room_invite_uses" ADD CONSTRAINT "room_invite_uses_invite_id_room_invites_id_fk" FOREIGN KEY ("invite_id") REFERENCES "public"."room_invites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_invite_uses" ADD CONSTRAINT "room_invite_uses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;