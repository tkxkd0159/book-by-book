-- Phase 1: Schema Extension
BEGIN;
  SET search_path TO bookapp;
  ALTER TABLE users
    ADD COLUMN IF NOT EXISTS provider text,
    ADD COLUMN IF NOT EXISTS provider_user_id text;
COMMIT;

-- Phase 2: Data Migration
BEGIN;
  SET search_path TO bookapp;
  UPDATE users
  SET
    provider = coalesce(users.provider, source.provider, 'google'),
    provider_user_id = coalesce(users.provider_user_id, source.provider_account_id, users.id::text)
  FROM (
    SELECT DISTINCT ON (auth_accounts.user_id)
      auth_accounts.user_id,
      auth_accounts.provider,
      auth_accounts.provider_account_id
    FROM auth_accounts
    ORDER BY auth_accounts.user_id, auth_accounts.updated_at DESC
  ) AS source
  WHERE users.id = source.user_id
    AND (users.provider IS NULL OR users.provider_user_id IS NULL);

  UPDATE users
  SET provider = coalesce(provider, 'google'),
      provider_user_id = coalesce(provider_user_id, users.id::text)
  WHERE provider IS NULL OR provider_user_id IS NULL;

  DO $$
  BEGIN
    IF EXISTS (
      SELECT 1
      FROM information_schema.table_constraints
      WHERE table_schema = 'bookapp'
        AND table_name = 'users'
        AND constraint_name = 'users_email_key'
        AND constraint_type = 'UNIQUE'
    ) THEN
      ALTER TABLE users DROP CONSTRAINT users_email_key;
    END IF;
  END
  $$;

  ALTER TABLE users
    ALTER COLUMN provider SET NOT NULL,
    ALTER COLUMN provider_user_id SET NOT NULL,
    ALTER COLUMN email DROP NOT NULL;

  ALTER TABLE users
    DROP CONSTRAINT IF EXISTS users_provider_user_uniq;

  ALTER TABLE users
    ADD CONSTRAINT users_provider_user_uniq UNIQUE (provider, provider_user_id);

  CREATE UNIQUE INDEX IF NOT EXISTS users_provider_email_uniq
  ON users (provider, email)
  WHERE email IS NOT NULL;

COMMIT;
