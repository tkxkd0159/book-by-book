-- Drop legacy NextAuth DB session storage.
-- The app uses JWT sessions in cookies, so auth_sessions is no longer needed.

BEGIN;
SET search_path TO bookapp;

DO $$
BEGIN
  IF to_regclass('bookapp.auth_sessions') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_auth_sessions_updated_at ON bookapp.auth_sessions';
  END IF;
END
$$;

DROP INDEX IF EXISTS auth_sessions_user_id_idx;
DROP INDEX IF EXISTS auth_sessions_expires_idx;
DROP TABLE IF EXISTS auth_sessions;

COMMIT;
