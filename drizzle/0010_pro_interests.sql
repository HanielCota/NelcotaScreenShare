CREATE TABLE "pro_interests" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pro_interests_email_check" CHECK (length("pro_interests"."email") <= 254)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "pro_interests_email_key" ON "pro_interests" USING btree (lower("email"));