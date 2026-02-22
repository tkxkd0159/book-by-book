# Book Club Application — Product + Technical Spec (Next.js + shadcn/ui)

## 0) Summary
A social book platform with:
- **Book Clubs** (public/private) where admins curate a shared set of books in three sections: **Want to Read**, **Reading**, **Read**.
- **Discussion Threads** per book inside a club (any club member can create threads for books in those sections).
- **Personal Shelves**: each user can create unlimited custom book lists independent of clubs.
- **Reviews**: each user can write one review per book; profile includes a **Reviewed** section.
- **Book data** sourced from **Google Books API**; local DB caches book metadata.

Non-negotiables:
- **Social login** required (Google now, extensible for future providers).
- **All necessary DB schemas** defined.
- **Next.js framework + shadcn/ui**.
- **Responsive design** required (works well on laptop + mobile).

---

## 1) Goals / Non-Goals

### Goals
- Enable club-based reading tracking and book-centric discussion.
- Provide personal shelves as a separate feature.
- Provide reviews and a “Reviewed” profile section.
- Integrate Google Books API as the source of truth for book discovery.
- Provide a flexible auth architecture for multiple OAuth providers over time.

### Non-Goals (for v1)
- Payments / subscriptions.
- E-readers, highlights, annotations.
- Complex moderation tooling (basic reporting can be added later).
- Real-time chat (threads are async).
- Full-text search infra beyond DB indexes (can add later).

---

## 2) Tech Stack (Recommended)
- **Next.js (App Router)** + **TypeScript**
- **shadcn/ui** + **Tailwind CSS**
- **PostgreSQL**
- Use raw SQL with `Postgre.js` and write a SQL files for our DB schemas.
- **Auth.js / NextAuth** (OAuth provider architecture; Google provider now)
- **Zod** for input validation
- **React Hook Form** for forms

---

## 3) Core Concepts

### Users
- Authenticated via OAuth (Google initially).
- Have a profile, personal shelves, and reviews.

### Books
- Discovered from Google Books API.
- Cached in local DB for stability, performance, and referential integrity.
- Identified by `googleVolumeId` (unique).

### Clubs
- Created by any user.
- **Visibility**:
  - `PUBLIC`: visible in discovery/search; any logged-in user can join.
  - `PRIVATE`: not listed; membership only via invite.
- Membership has roles: `OWNER`, `ADMIN`, `MEMBER`.

### Club Book Sections
Fixed statuses:
- `WANT_TO_READ`
- `READING`
- `READ`

Admin assigns books to these sections for the club.

### Threads
- Belong to a club + book.
- Any club member can create.
- Thread contains posts/comments.

### Personal Shelves
- Each user can create unlimited shelves (custom lists).
- Each shelf holds many books (items can have notes/order).

### Reviews
- One review per user per book.
- Appears under user profile “Reviewed”.
- Reviews are globally visible by default (can add privacy later).

---

## 4) Permissions & Rules

### Authentication
- Must be logged in to:
  - Create/join clubs
  - Create threads/posts
  - Create shelves
  - Write reviews

### Clubs
- **Create club**: any authenticated user.
- **Update club settings** (name, visibility, description): `OWNER` or `ADMIN`.
- **Invite**: `OWNER` or `ADMIN`.
- **Join**:
  - `PUBLIC`: any authenticated user can join.
  - `PRIVATE`: only via invite.
- **Remove member**: `OWNER`/`ADMIN` can remove `MEMBER`; only `OWNER` can demote/remove `ADMIN` (recommended).
- **Delete club**: `OWNER` only.

### Club Books (sections)
- **Assign/move/remove book** between sections: `OWNER`/`ADMIN`.
- **Create thread**: any `MEMBER`+ for books currently present in any section.

### Threads & Posts
- Create thread: club member.
- Create post: club member.
- Edit/delete:
  - Author can edit/delete own post/thread (within policy).
  - Admins can delete any content in their club (recommended).

### Shelves
- User owns their shelves.
- Only owner can modify shelves/items.

### Reviews
- User can create/update/delete own review.
- One review per (user, book).

---

## 5) Data Model (DB Schema)

### 5.1 Entity Relationship Overview
- `User` 1—* `Club` (createdBy)
- `Club` 1—* `ClubMember`
- `Club` 1—* `ClubInvitation`
- `Club` 1—* `ClubBook` (book placed into club sections)
- `ClubBook` 1—* `Thread`
- `Thread` 1—* `ThreadPost`
- `User` 1—* `Thread` (author)
- `User` 1—* `ThreadPost` (author)
- `User` 1—* `Shelf` 1—* `ShelfItem`
- `User` 1—* `Review`
- `Book` referenced by `ClubBook`, `ShelfItem`, `Review`

### 5.2 Database Schema (PostgreSQL)
Use envsubst to replace `$APP_USER_PASSWORD` with a secure password when running the schema setup. 

```sql
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
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider         text        NOT NULL,
  provider_user_id text        NOT NULL,
  email            citext,
  name             text,
  image_url        text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_provider_user_uniq UNIQUE (provider, provider_user_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS users_provider_email_uniq
ON users (provider, email)
WHERE email IS NOT NULL;

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
```

### 5.3 Notes on DB Design Decisions
* `Book` caches Google Books metadata and stores `rawGoogleJson` to avoid losing fields.
* `ClubBook` is the canonical representation of "book in a club + status section".
* `Thread` references both `clubBookId` and `bookId` (denormalized) for fast queries.
* Auth sessions use NextAuth JWT cookies, so there is no `auth_sessions` table.
* Invitations support:
  - `invitedUserId` (existing user)
  - `invitedEmail` (claim later)
* Personal shelves are independent of clubs by design.


## 6) Google Books API Integration

### 6.1 API Usage

Primary actions:
1. Search: query by title/author/ISBN via Google Books volumes endpoint.
2. Fetch volume: retrieve by googleVolumeId.

Store in DB:
- On selection (“Add book”), upsert into Book by googleVolumeId.
- Always prefer DB copy when rendering internal pages; refresh opportunistically.

6.3 Rate Limiting / Caching
- Cache search results on the server for short TTL (e.g., 1–5 minutes) to reduce repeated calls.
- Avoid calling Google Books from the client directly; use Next.js route handlers.

6.4 Environment Variables
- `GOOGLE_BOOKS_API_KEY` (if needed; some endpoints can work without but quota will be limited)
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `AUTH_SECRET` (Auth.js / NextAuth secret)
- `DATABASE_URL`

## 7) Auth Architecture (Flexible Social Login)

### 7.1
- Only Google login in v1.
- Must be extensible to add providers (GitHub, Apple, etc.).

### 7.2 Implementation (Auth.js / NextAuth)
- Use provider-based Account table to support multiple identities per user.
- Persist app user identity with `(provider, provider_user_id)` and keep email nullable/non-global-unique.
- Use JWT session strategy (encrypted JWT in cookie), not database-backed `auth_sessions`.
- Future providers only require:
  - adding provider config
  - ensuring account linking is correct by provider account identity (or explicit linking UI later)


### 7.3 Auth Rules
- All core actions require auth.
- Unauthenticated users can view limited pages if you choose (e.g., marketing). For v1, keep it simple:
  - `/` landing public
  - everything else redirects to `signin`

## 8) Application Routes (Next.js App Router)

### 8.1 Pages (UI)

- `/` — landing (public)
- `/signin` — auth entry (Google button)
- `/books/search` — search Google Books + add to shelves/clubs
- `/books/[googleVolumeId]` — book details (from DB or fetched+cached. Store book data in our DB after any user searches for it or tries to add it to a club/shelf.)
- `/clubs` — discover public clubs + user’s clubs
- `/clubs/new` — create club
- `/clubs/[clubId]` — club home (book sections)
- `/clubs/[clubId]/settings` — club admins only
- `/clubs/[clubId]/invite` — club admins only
- `/clubs/[clubId]/books/[clubBookId]` — book-in-club page: threads list, create thread
- `/clubs/[clubId]/threads/[threadId]` — thread detail + posts
- `/me` — profile overview
- `/me/shelves` — list shelves
- `/me/shelves/new`
- `/me/shelves/[shelfId]` — shelf detail + items
- `/me/reviewed` — reviewed books list
- `/me/reviews/[googleVolumeId]` — create/edit review for a book*

### 8.2 Route Handlers / Server Actions (API)
Prefer Server Actions for mutations; use route handlers for Google Books proxying and if you need REST.

- GET /api/books/search?q=...
  - Calls Google Books API, returns normalized results.
- POST /api/books/import
  - Body: { googleVolumeId }
  - Upserts into Book table.

Mutations (Server Actions recommended):
- createClub({name, description, visibility})
- updateClub(clubId, {...})
- inviteToClub(clubId, {email|userId})
- acceptInvite(token) / joinClub(clubId) (public)
- addBookToClub(clubId, bookId, status)
- moveClubBook(clubBookId, status, sortOrder?)
- removeClubBook(clubBookId)
- createThread(clubBookId, {title, body?})
- createPost(threadId, {body})
- editPost(postId, {body})
- deletePost(postId)
- createShelf({name, description, isPublic, slug?})
- addShelfItem(shelfId, bookId, note?, sortOrder?)
- removeShelfItem(shelfId, bookId)
- upsertReview(bookId, {rating, title, body, containsSpoilers})
- deleteReview(bookId)

## 9) UI/UX Spec (shadcn/ui)

### 9.1 Design System

Use shadcn/ui primitives:
- Button, Card, Badge, Tabs, Dialog, Drawer (mobile), DropdownMenu
- Form, Input, Textarea, Select, Popover, Command (search combobox)
- Avatar, Separator, Skeleton, Toast/Sonner

### 9.2 Key Screens
Club Home (/clubs/[clubId])
- Header: club name, visibility badge, join/leave buttons (as applicable), settings (admins).
- 3-section layout:
  - Tabs on mobile (Want to Read / Reading / Read)
  - 3 columns on desktop (optional; tabs also acceptable)

- Each book card:
  - thumbnail, title, authors
  - "Open" button to book-in-club page
  - Admin controls: move status, remove, reorder

Book-in-Club (/clubs/[clubId]/books/[clubBookId])
- Book header with metadata
- Thread list
- "Create thread" button opens dialog
- Sorting: newest, pinned first

Thread Detail (/clubs/[clubId]/threads/[threadId])
- Thread header: title, author, timestamps
- Post composer at bottom (or top on desktop)
- Posts list with edit/delete for author

Personal Shelves (/me/shelves)
- List shelves with count of items
- Create shelf dialog/page

Shelf Detail (/me/shelves/[shelfId])
- Header with shelf name, privacy badge
- Add book via search dialog (Command palette)
- Items list with remove and optional reorder

Reviews
- Book page shows:
  - user’s review (if exists) + edit
  - aggregate list of reviews (optional for v1; can be added later)
- /me/reviewed shows all reviewed books with rating snippet

## 10) Responsive Design Guide (Must Follow)

### 10.1 Princiiples
- Mobile-first layout with Tailwind breakpoints:
  - sm (≥640px), md (≥768px), lg (≥1024px), xl (≥1280px)
- Avoid fixed widths; use max-w-*, w-full, responsive grid/flex.
-Use Tabs or Accordion for multi-column content on mobile.
- Use Drawer (shadcn) instead of modal dialogs on small screens for long forms.

### 10.2 Layout Patterns
Global Container
- Use:
  - `max-w-6xl mx-auto px-4 sm:px-6 lg:px-8`
- Keep primary actions visible without horizontal scrolling.

Club Sections (3 lists)
- Mobile (<md):
  - Use Tabs for section switching.
  - Each tab shows a vertical list.
- Desktop (≥lg):
  - Use grid grid-cols-3 gap-4 for three columns OR keep tabs (tabs is acceptable if simpler).
- Ensure book cards are touch-friendly:
  - min tap targets 44px height (use py-3 on buttons).

Thread Page
- Mobile:
  - Post composer as sticky bottom bar (sticky bottom-0) with safe padding.
  - Use Textarea that expands.

- Desktop:
  - Composer can be above list or below; no sticky needed.

Navigation
- Mobile:
  - Consider a bottom nav with 3–4 destinations: Clubs, Search, Shelves, Profile.
  - Or a hamburger menu using Sheet.

- Desktop:
  - Top nav with persistent links.

### 10.3 Performance/UX on Mobile
- Use `next/image` for thumbnails with proper `sizes`.
- Skeleton loaders for lists.
- Avoid rendering huge lists; paginate threads and posts.
- Use server components for read-heavy pages; client components only where needed.


## 11) Validation & Constraints

### 11.1 Input Validation (Zod)
- Club name: 2–60 chars
- Thread title: 2–120 chars
- Post body: 1–10,000 chars
- Review rating: integer 1..5 (optional)
- Shelf name: 1–60 chars
- Invitation expiry: default 7 days

### 11.2 Database Constraints
- `User.email` unique
- `Book.googleVolumeId` unique
- `ClubMember(clubId, userId)` unique
- `ClubBook(clubId, bookId)` unique
- `ShelfItem(shelfId, bookId)` unique
- `Review(userId, bookId)` unique

## Security Requirements
- All mutations require authenticated user.
- Every club action must verify membership + role on server side.
- Invitation token must be:
  - cryptographically random (e.g., 32+ bytes)
  - stored hashed (recommended) OR stored raw with short expiry (acceptable v1)
- Protect Google Books API key by proxying requests server-side.
- Prevent IDOR:
  - Always scope queries by clubId + membership checks.
  - For shelves, always scope by userId.

## 13) MVP Milestones

Milestone 1 — Auth + Books
- Google login
- Book search + import/cache
- Book detail page

Milestone 2 — Clubs + Sections
- Create club (public/private)
- Join public club
- Invite flow for private club
- Add/move/remove books in club sections (admin)

Milestone 3 — Threads
- Create thread per clubBook
- Posts, edit/delete own posts
- Basic pagination

Milestone 4 — Personal Shelves + Reviews
- Create shelves
- Add/remove books from shelves
- Create/edit/delete review
- Profile reviewed list

## 14) Implementation Notes (Practical Defaults)

### 14.1 Club Creation Default
When a user creates a club:
- Create `Club`
- Create `ClubMember` for creator with role `OWNER`
- `ADMIN` role can be added by owner; They can manage members and books but cannot delete club or change visibility.

### 14.2 Public vs Private Join Logic
- `PUBLIC`: show “Join club” button; joining inserts ClubMember after `OWNER` or `ADMIN` approval
- `PRIVATE`: hide join; only "Request join".

### 14.3 Thread Eligibility
- Thread creation requires that `ClubBook` exists (book must be in one of the three sections).
- If admin removes the book from the club:
  - Keep threads (recommended) but mark book removed state by leaving ClubBook deleted?
  - Preferred: do NOT hard-delete ClubBook. Instead add removedAt nullable column to ClubBook so thread references remain valid.
  - If you want this now, modify schema: add removedAt DateTime? and filter out removed entries from lists.

(If you keep the schema as-is, do not allow deleting a ClubBook if threads exist; implement as "archive".)


### 14.4 Sorting within Sections
Use `sortOrder`:
- On add: set `sortOrder = max+1` in that section.
- On reorder: update affected rows.


## 15) Future Enhancements
- Notifications (invites, replies)
- Review aggregation (average rating) on book page
- Advanced search and filters
