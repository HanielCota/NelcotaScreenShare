-- ===== Handwritten: English messages for the immutable audit log guard =====
-- Same rule as 0003 (UPDATE never; DELETE only for records older than 5 years); only the
-- error texts change. The trigger keeps pointing at this function, so it is not recreated.
CREATE OR REPLACE FUNCTION audit_logs_guard() RETURNS trigger
  LANGUAGE plpgsql
  AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'audit_logs is immutable';
  END IF;
  IF TG_OP = 'DELETE' AND OLD.created_at > now() - interval '5 years' THEN
    RAISE EXCEPTION 'audit_logs: only records older than 5 years can be deleted';
  END IF;
  RETURN OLD;
END $$;
