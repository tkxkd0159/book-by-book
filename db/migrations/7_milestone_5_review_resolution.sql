BEGIN;

SET search_path TO bookapp;

DROP INDEX IF EXISTS users_provider_email_uniq;

CREATE UNIQUE INDEX IF NOT EXISTS users_email_uniq
ON users (email)
WHERE email IS NOT NULL;

DELETE FROM club_invitations
WHERE invited_user_id IS NULL;

DROP INDEX IF EXISTS club_invitations_pending_email_uniq;
DROP INDEX IF EXISTS club_invitations_invited_email_idx;

ALTER TABLE club_invitations
  DROP CONSTRAINT IF EXISTS club_invitations_target_chk;

ALTER TABLE club_invitations
  DROP COLUMN IF EXISTS invited_email;

ALTER TABLE club_invitations
  ADD CONSTRAINT club_invitations_target_chk
  CHECK (invited_user_id IS NOT NULL);

COMMIT;
