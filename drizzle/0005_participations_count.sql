ALTER TABLE "users" ADD COLUMN "participations_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX "users_participations_idx" ON "users" USING btree ("participations_count" DESC NULLS LAST,"id" DESC NULLS LAST) WHERE "users"."deleted_at" is null;--> statement-breakpoint
-- ===== Handwritten: per-participant participations counter =====
CREATE OR REPLACE FUNCTION users_count_participations() RETURNS trigger
  LANGUAGE plpgsql
  AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') AND OLD.user_id IS NOT NULL THEN
    UPDATE users SET participations_count = participations_count - 1 WHERE id = OLD.user_id;
  END IF;
  IF TG_OP IN ('UPDATE', 'INSERT') AND NEW.user_id IS NOT NULL THEN
    UPDATE users SET participations_count = participations_count + 1 WHERE id = NEW.user_id;
  END IF;
  RETURN NULL;
END $$;--> statement-breakpoint
CREATE TRIGGER room_participations_count_insert_delete
  AFTER INSERT OR DELETE ON room_participations
  FOR EACH ROW EXECUTE FUNCTION users_count_participations();--> statement-breakpoint
CREATE TRIGGER room_participations_count_user_change
  AFTER UPDATE OF user_id ON room_participations
  FOR EACH ROW WHEN (OLD.user_id IS DISTINCT FROM NEW.user_id)
  EXECUTE FUNCTION users_count_participations();--> statement-breakpoint
UPDATE users u SET participations_count = c.total
FROM (SELECT user_id, count(*)::int AS total FROM room_participations
      WHERE user_id IS NOT NULL GROUP BY user_id) AS c
WHERE u.id = c.user_id;
