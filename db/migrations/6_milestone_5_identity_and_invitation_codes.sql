BEGIN;

SET search_path TO bookapp;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS nickname text,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS country_code text,
  ADD COLUMN IF NOT EXISTS favorite_genres text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS signup_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS password_hash text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_nickname_chk'
      AND conrelid = 'bookapp.users'::regclass
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_nickname_chk
      CHECK (nickname IS NULL OR nickname ~ '^[a-z0-9_-]{3,20}$');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_gender_chk'
      AND conrelid = 'bookapp.users'::regclass
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_gender_chk
      CHECK (
        gender IS NULL OR gender IN (
          'MAN',
          'WOMAN',
          'NON_BINARY',
          'PREFER_NOT_TO_SAY'
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_country_code_chk'
      AND conrelid = 'bookapp.users'::regclass
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_country_code_chk
      CHECK (country_code IS NULL OR country_code ~ '^[A-Z]{2}$');
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS users_nickname_uniq
ON users (nickname)
WHERE nickname IS NOT NULL;

CREATE TABLE IF NOT EXISTS invitation_codes (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  purpose       text        NOT NULL,
  code_hash     text        NOT NULL UNIQUE,
  label         text        NOT NULL,
  is_active     boolean     NOT NULL DEFAULT true,
  expires_at    timestamptz,
  max_uses      integer,
  created_by_id uuid        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT invitation_codes_purpose_chk CHECK (purpose IN ('BETA_SIGNUP')),
  CONSTRAINT invitation_codes_max_uses_chk CHECK (max_uses IS NULL OR max_uses > 0)
);

DROP TRIGGER IF EXISTS trg_invitation_codes_updated_at ON invitation_codes;
CREATE TRIGGER trg_invitation_codes_updated_at
BEFORE UPDATE ON invitation_codes
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS invitation_codes_purpose_status_idx
ON invitation_codes(purpose, is_active);
CREATE INDEX IF NOT EXISTS invitation_codes_created_by_id_idx
ON invitation_codes(created_by_id);
CREATE INDEX IF NOT EXISTS invitation_codes_expires_at_idx
ON invitation_codes(expires_at);

CREATE TABLE IF NOT EXISTS invitation_code_redemptions (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id    uuid        NOT NULL REFERENCES invitation_codes(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT invitation_code_redemptions_code_user_uniq UNIQUE (code_id, user_id)
);

CREATE INDEX IF NOT EXISTS invitation_code_redemptions_code_id_idx
ON invitation_code_redemptions(code_id);
CREATE INDEX IF NOT EXISTS invitation_code_redemptions_user_id_idx
ON invitation_code_redemptions(user_id);
CREATE INDEX IF NOT EXISTS invitation_code_redemptions_created_at_idx
ON invitation_code_redemptions(created_at DESC);

COMMIT;
