-- schema.sql
-- Book Club Application (Next.js + Postgres.js) — Raw SQL Schema
-- Target DB: PostgreSQL
--
-- Recommended usage:
--   - Run via your migration tool of choice (e.g., node-pg-migrate, drizzle migrations, custom runner).
--   - Keep this file as the baseline initial migration.

BEGIN;

CREATE SCHEMA IF NOT EXISTS bookapp;
SET search_path TO bookapp;

-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto; -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS citext;   -- case-insensitive email

-- Optional (useful if you later add local fuzzy search on titles)
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- -------------------------------------------------------------------
-- Updated-at trigger helper
-- -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


-- -------------------------------------------------------------------
-- Dedicated DB user for application security
-- -------------------------------------------------------------------

DO $$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'bbb_bff') THEN
      CREATE USER bbb_bff WITH PASSWORD '$APP_USER_PASSWORD';
   END IF;
END $$;

GRANT USAGE ON SCHEMA bookapp TO bbb_bff;

-- Allow the user to create new tables/indexes inside it
GRANT CREATE ON SCHEMA bookapp TO bbb_bff;

-- Grant access to the database itself (required for login)
GRANT CONNECT ON DATABASE postgres TO bbb_bff;

-- Ensure bbb_bff automatically gets access to new tables/sequences
ALTER DEFAULT PRIVILEGES IN SCHEMA bookapp 
GRANT ALL ON TABLES TO bbb_bff;

ALTER DEFAULT PRIVILEGES IN SCHEMA bookapp 
GRANT ALL ON SEQUENCES TO bbb_bff;

-- -------------------------------------------------------------------
-- Auth / Users (Auth.js / NextAuth compatible shape)
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email        citext      NOT NULL UNIQUE,
  name         text,
  image_url    text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS auth_accounts (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type                text        NOT NULL,
  provider            text        NOT NULL,
  provider_account_id text        NOT NULL,
  refresh_token       text,
  access_token        text,
  expires_at          bigint,
  token_type          text,
  scope               text,
  id_token            text,
  session_state       text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT auth_accounts_provider_uniq UNIQUE (provider, provider_account_id)
);

CREATE INDEX IF NOT EXISTS auth_accounts_user_id_idx ON auth_accounts(user_id);

DROP TRIGGER IF EXISTS trg_auth_accounts_updated_at ON auth_accounts;
CREATE TRIGGER trg_auth_accounts_updated_at
BEFORE UPDATE ON auth_accounts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS auth_sessions (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token text        NOT NULL UNIQUE,
  user_id       uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires       timestamptz NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS auth_sessions_user_id_idx ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS auth_sessions_expires_idx ON auth_sessions(expires);

DROP TRIGGER IF EXISTS trg_auth_sessions_updated_at ON auth_sessions;
CREATE TRIGGER trg_auth_sessions_updated_at
BEFORE UPDATE ON auth_sessions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Used by some auth flows (email magic links, etc.). Keep for compatibility/future.
CREATE TABLE IF NOT EXISTS auth_verification_tokens (
  identifier citext      NOT NULL,
  token      text        NOT NULL,
  expires    timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (identifier, token),
  CONSTRAINT auth_verification_tokens_token_uniq UNIQUE (token)
);

CREATE INDEX IF NOT EXISTS auth_verification_tokens_expires_idx ON auth_verification_tokens(expires);

-- -------------------------------------------------------------------
-- Books (cached from Google Books API)
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS books (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  google_volume_id text        NOT NULL UNIQUE,

  title            text        NOT NULL,
  subtitle         text,
  authors          text[]      NOT NULL DEFAULT '{}'::text[],
  publisher        text,
  published_date   text,               -- keep raw format from Google (YYYY / YYYY-MM-DD / etc.)
  description      text,
  isbn10           text,
  isbn13           text,
  page_count       integer,
  categories       text[]      NOT NULL DEFAULT '{}'::text[],
  language         text,
  thumbnail_url    text,
  preview_link     text,
  info_link        text,
  canonical_link   text,

  raw_google_json  jsonb,              -- optional snapshot for resilience

  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_books_updated_at ON books;
CREATE TRIGGER trg_books_updated_at
BEFORE UPDATE ON books
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS books_title_idx ON books(title);
CREATE INDEX IF NOT EXISTS books_isbn10_idx ON books(isbn10);
CREATE INDEX IF NOT EXISTS books_isbn13_idx ON books(isbn13);

-- Optional fuzzy title search:
-- CREATE INDEX IF NOT EXISTS books_title_trgm_idx ON books USING gin (title gin_trgm_ops);

-- -------------------------------------------------------------------
-- Clubs
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clubs (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text        NOT NULL,
  description   text,
  visibility    text        NOT NULL DEFAULT 'PUBLIC',
  created_by_id uuid        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT clubs_visibility_chk CHECK (visibility IN ('PUBLIC', 'PRIVATE'))
);

DROP TRIGGER IF EXISTS trg_clubs_updated_at ON clubs;
CREATE TRIGGER trg_clubs_updated_at
BEFORE UPDATE ON clubs
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS clubs_visibility_idx ON clubs(visibility);
CREATE INDEX IF NOT EXISTS clubs_created_by_id_idx ON clubs(created_by_id);

-- Club memberships (roles: OWNER / ADMIN / MEMBER)
CREATE TABLE IF NOT EXISTS club_members (
  id        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id   uuid        NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id   uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role      text        NOT NULL DEFAULT 'MEMBER',
  joined_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT club_members_role_chk CHECK (role IN ('OWNER', 'ADMIN', 'MEMBER')),
  CONSTRAINT club_members_uniq UNIQUE (club_id, user_id)
);

CREATE INDEX IF NOT EXISTS club_members_user_id_idx ON club_members(user_id);
CREATE INDEX IF NOT EXISTS club_members_club_role_idx ON club_members(club_id, role);

-- Invitations (supports inviting by existing user_id OR by email for claim-on-signup)
CREATE TABLE IF NOT EXISTS club_invitations (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id         uuid        NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  invited_by_id   uuid        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

  invited_user_id uuid        REFERENCES users(id) ON DELETE SET NULL,
  invited_email   citext,

  status          text        NOT NULL DEFAULT 'PENDING',
  token_hash      text        NOT NULL UNIQUE, -- store hash(token); do NOT store raw token
  expires_at      timestamptz NOT NULL,

  created_at      timestamptz NOT NULL DEFAULT now(),
  accepted_at     timestamptz,
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT club_invitations_status_chk CHECK (status IN ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED')),
  CONSTRAINT club_invitations_target_chk CHECK (invited_user_id IS NOT NULL OR invited_email IS NOT NULL)
);

DROP TRIGGER IF EXISTS trg_club_invitations_updated_at ON club_invitations;
CREATE TRIGGER trg_club_invitations_updated_at
BEFORE UPDATE ON club_invitations
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS club_invitations_club_status_idx ON club_invitations(club_id, status);
CREATE INDEX IF NOT EXISTS club_invitations_invited_email_idx ON club_invitations(invited_email);
CREATE INDEX IF NOT EXISTS club_invitations_invited_user_id_idx ON club_invitations(invited_user_id);
CREATE INDEX IF NOT EXISTS club_invitations_expires_at_idx ON club_invitations(expires_at);

-- Prevent multiple pending invites for same club+email or club+user
CREATE UNIQUE INDEX IF NOT EXISTS club_invitations_pending_email_uniq
ON club_invitations (club_id, invited_email)
WHERE status = 'PENDING' AND invited_email IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS club_invitations_pending_user_uniq
ON club_invitations (club_id, invited_user_id)
WHERE status = 'PENDING' AND invited_user_id IS NOT NULL;

-- -------------------------------------------------------------------
-- Club books (club sections) + soft remove
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS club_books (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id     uuid        NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  book_id     uuid        NOT NULL REFERENCES books(id) ON DELETE RESTRICT,
  status      text        NOT NULL,
  added_by_id uuid        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

  sort_order  integer     NOT NULL DEFAULT 0,
  added_at    timestamptz NOT NULL DEFAULT now(),
  removed_at  timestamptz,

  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT club_books_status_chk CHECK (status IN ('WANT_TO_READ', 'READING', 'READ')),
  CONSTRAINT club_books_uniq UNIQUE (club_id, book_id),
  CONSTRAINT club_books_club_id_id_uniq UNIQUE (club_id, id) -- enables composite FK from threads
);

DROP TRIGGER IF EXISTS trg_club_books_updated_at ON club_books;
CREATE TRIGGER trg_club_books_updated_at
BEFORE UPDATE ON club_books
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Active books per section (fast queries)
CREATE INDEX IF NOT EXISTS club_books_active_section_idx
ON club_books (club_id, status, sort_order)
WHERE removed_at IS NULL;

CREATE INDEX IF NOT EXISTS club_books_book_id_idx ON club_books(book_id);

-- -------------------------------------------------------------------
-- Threads + Posts (discussion per club book)
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS threads (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  club_id      uuid        NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  club_book_id uuid        NOT NULL,
  book_id      uuid        NOT NULL REFERENCES books(id) ON DELETE RESTRICT,
  author_id    uuid        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

  title        text        NOT NULL,
  body         text,

  is_locked    boolean     NOT NULL DEFAULT false,
  is_pinned    boolean     NOT NULL DEFAULT false,

  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  deleted_at   timestamptz,

  -- Ensures the referenced club_book belongs to the same club_id
  CONSTRAINT threads_club_book_fk
    FOREIGN KEY (club_id, club_book_id)
    REFERENCES club_books (club_id, id)
    ON DELETE RESTRICT
);

DROP TRIGGER IF EXISTS trg_threads_updated_at ON threads;
CREATE TRIGGER trg_threads_updated_at
BEFORE UPDATE ON threads
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS threads_club_created_at_idx ON threads(club_id, created_at DESC);
CREATE INDEX IF NOT EXISTS threads_club_book_created_at_idx ON threads(club_book_id, created_at DESC);
CREATE INDEX IF NOT EXISTS threads_book_created_at_idx ON threads(book_id, created_at DESC);
CREATE INDEX IF NOT EXISTS threads_author_created_at_idx ON threads(author_id, created_at DESC);

CREATE TABLE IF NOT EXISTS thread_posts (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id  uuid        NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  author_id  uuid        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  body       text        NOT NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

DROP TRIGGER IF EXISTS trg_thread_posts_updated_at ON thread_posts;
CREATE TRIGGER trg_thread_posts_updated_at
BEFORE UPDATE ON thread_posts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS thread_posts_thread_created_at_idx ON thread_posts(thread_id, created_at);
CREATE INDEX IF NOT EXISTS thread_posts_author_created_at_idx ON thread_posts(author_id, created_at DESC);

-- -------------------------------------------------------------------
-- Personal shelves (custom lists) + items
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shelves (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  name        text        NOT NULL,
  description text,
  is_public   boolean     NOT NULL DEFAULT false,
  slug        text,

  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT shelves_user_slug_uniq UNIQUE (user_id, slug)
);

DROP TRIGGER IF EXISTS trg_shelves_updated_at ON shelves;
CREATE TRIGGER trg_shelves_updated_at
BEFORE UPDATE ON shelves
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS shelves_user_created_at_idx ON shelves(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS shelf_items (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  shelf_id   uuid        NOT NULL REFERENCES shelves(id) ON DELETE CASCADE,
  book_id    uuid        NOT NULL REFERENCES books(id) ON DELETE RESTRICT,

  note       text,
  sort_order integer     NOT NULL DEFAULT 0,
  added_at   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT shelf_items_uniq UNIQUE (shelf_id, book_id)
);

CREATE INDEX IF NOT EXISTS shelf_items_shelf_sort_idx ON shelf_items(shelf_id, sort_order);
CREATE INDEX IF NOT EXISTS shelf_items_book_id_idx ON shelf_items(book_id);

-- -------------------------------------------------------------------
-- Reviews (one per user per book) + "Reviewed" profile section
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reviews (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id            uuid        NOT NULL REFERENCES books(id) ON DELETE RESTRICT,

  rating             smallint,
  title              text,
  body               text,
  contains_spoilers  boolean     NOT NULL DEFAULT false,

  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  deleted_at         timestamptz,

  CONSTRAINT reviews_uniq UNIQUE (user_id, book_id),
  CONSTRAINT reviews_rating_chk CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5))
);

DROP TRIGGER IF EXISTS trg_reviews_updated_at ON reviews;
CREATE TRIGGER trg_reviews_updated_at
BEFORE UPDATE ON reviews
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS reviews_book_created_at_idx ON reviews(book_id, created_at DESC);
CREATE INDEX IF NOT EXISTS reviews_user_created_at_idx ON reviews(user_id, created_at DESC);

COMMIT;
