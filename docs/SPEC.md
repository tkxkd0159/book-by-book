# Book Club Application — Product + Technical Spec (Next.js + shadcn/ui)

## 0) Summary
A social book platform with:
- **Book Clubs** (public/private) where admins curate a shared set of books in three sections: **Want to Read**, **Reading**, **Read**.
- **Discussion Threads** per book inside a club (any club member can create threads for books in those sections).
- **Personal Shelves**: each user can create unlimited custom book lists independent of clubs.
- **Reviews**: each user can write one review per book; profile includes a **Reviewed** section.
- **Closed beta onboarding**: social login authenticates the external account first, then Book by Book signup collects a stable nickname, gender, country, favorite genres, and a beta invitation code before app access is granted.
- **Book data** sourced from **Google Books API**; local DB caches book metadata.

Non-negotiables:
- **Social login** required (Google now, extensible for future providers).
- **Completed signup** required before users can access core product routes.
- **Nickname** is the stable public identity used across the app.
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
- Gate beta access through completed signup and a server-controlled invitation code.
- Use a Book by Book nickname instead of provider identity or email for app-facing sharing and invites.

### Non-Goals (for v1 / beta)
- Payments / subscriptions.
- E-readers, highlights, annotations.
- Complex moderation tooling (basic reporting can be added later).
- Real-time chat (threads are async).
- Full-text search infra beyond DB indexes (can add later).
- Nickname change UI.
- Public profile pages beyond shareable public shelf routes.
- Admin UI for managing beta invitation codes.

---

## 2) Tech Stack (Recommended)
- **Next.js (App Router)** + **TypeScript**
- **shadcn/ui** + **Tailwind CSS**
- **PostgreSQL**
- Use raw SQL with `Postgre.js` and write SQL files for our DB schemas.
- **Auth.js / NextAuth** (OAuth provider architecture; Google provider now)
- **Zod** for input validation
- **React Hook Form** for forms

---

## 3) Core Concepts

### Users
- Authenticate via OAuth (Google initially).
- Complete Book by Book signup before they can use `/books`, `/clubs`, `/me`, or invite acceptance flows.
- Have a stable Book by Book nickname that becomes their public app identity.
- Keep provider `email`, `name`, and `image` as provider metadata rather than the app’s primary identity.
- Have a profile, personal shelves, and reviews.

### Books
- Discovered from Google Books API.
- Cached in local DB for stability, performance, and referential integrity.
- Identified by `googleVolumeId` (unique).

### Clubs
- Created by any signed-up user.
- **Visibility**:
  - `PUBLIC`: visible in discovery/search; any signed-up user can join immediately.
  - `PRIVATE`: not listed; membership only via invite.
- Membership has roles: `OWNER`, `ADMIN`, `MEMBER`.
- Private invites target an existing signed-up Book by Book user via nickname, then resolve to `invitedUserId` on the server.

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
- Thread and post authors are displayed by Book by Book nickname.

### Personal Shelves
- Each user can create unlimited shelves (custom lists).
- Each shelf holds many books (items can have notes/order).
- Public shelf sharing uses the owner nickname plus shelfId in the URL.

### Reviews
- One review per user per book.
- Appears under user profile “Reviewed”.
- Reviews are globally visible by default within the signed-in app (can add privacy later).
- Review authors are displayed by Book by Book nickname.

---

## 4) Permissions & Rules

### Authentication
- Must be authenticated **and have completed signup** to:
  - Create/join clubs
  - Create threads/posts
  - Create shelves
  - Write reviews
  - Accept private club invitations
- Authenticated users who have not completed signup may only access:
  - `/signup`
  - auth pages and callbacks needed to finish sign-in
  - sign-out

### Clubs
- **Create club**: any signed-up user.
- **Update club settings** (name, visibility, description): `OWNER` or `ADMIN`.
- **Invite**: `OWNER` or `ADMIN`.
- **Join**:
  - `PUBLIC`: any signed-up user can join.
  - `PRIVATE`: only via invite.
- **Invite target**:
  - enter a nickname
  - server resolves the nickname to an existing signed-up user
  - invite acceptance must match the signed-in invited user
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
- Signed-in non-owners can read a public shelf by nickname route.

### Reviews
- User can create/update/delete own review.
- One review per (user, book).

---

## 5) Data Model (DB Schema)

### 5.1 Entity Relationship Overview
- `User` 1—* `AuthAccount`
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

See [`db/schema/data.sql`](./db/schema/data.sql) for the full SQL schema definition.

Schema and migration workflow:
- `db/schema/data.sql` is continuously updated and is the latest source-of-truth schema.
- Use `db/schema/data.sql` directly when provisioning a fresh database (e2e/local/new deployment environment).
- For any schema/index/constraint change, append a new sequential migration SQL file in `db/migrations/` for production rollout.
- Keep existing migrations immutable; do not modify `db/migrations/1_baseline.sql`.

### 5.3 Notes on DB Design Decisions
- `Book` caches Google Books metadata and stores `rawGoogleJson` to avoid losing fields.
- `ClubBook` is the canonical representation of “book in a club + status section”.
- `Thread` references both `clubBookId` and `bookId` (denormalized) for fast queries.
- Auth sessions use NextAuth JWT cookies, so there is no `auth_sessions` table.
- `users` stores both provider metadata and the Book by Book profile fields needed for signup completion:
  - `nickname`
  - `gender`
  - `countryCode`
  - `favoriteGenres`
  - `signupCompletedAt`
- OAuth authentication and Book by Book signup are separate states:
  - a user row may exist before signup is complete
  - `signupCompletedAt` distinguishes authenticated-but-incomplete accounts from usable app users
- `nickname` is immutable, unique, lowercase, and URL-safe.
- `favoriteGenres` is stored as a validated flat list even though the UI groups Fiction and Non-Fiction separately.
- Private club invitations target `invitedUserId`; the invite UI resolves nickname to that user on the server.
- Raw beta invitation codes are never stored in the database.
- Personal shelves are independent of clubs by design.
- Public shelf URLs use nickname + shelfId, but internal authorization still keys ownership by userId.

## 6) Google Books API Integration

### 6.1 API Usage

Primary actions:
1. Search: query by title/author/ISBN via Google Books volumes endpoint.
2. Fetch volume: retrieve by googleVolumeId.

Store in DB:
- On selection (“Add book”), upsert into `Book` by `googleVolumeId`.
- Always prefer DB copy when rendering internal pages; refresh opportunistically.

### 6.2 Rate Limiting / Caching
- Cache search results on the server for short TTL (for example 1–5 minutes) to reduce repeated calls.
- Avoid calling Google Books from the client directly; use Next.js route handlers.

### 6.3 Environment Variables
- `GOOGLE_BOOKS_API_KEY` (if needed; some endpoints can work without but quota will be limited)
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `AUTH_SECRET` (Auth.js / NextAuth secret)
- `DATABASE_URL`
- `BETA_INVITATION_CODE`

## 7) Auth Architecture (Flexible Social Login)

### 7.1 Provider Support
- Only Google login in v1 / beta.
- Must be extensible to add providers later (GitHub, Apple, Instagram, etc.).

### 7.2 Implementation (Auth.js / NextAuth)
- Use a provider-based `auth_accounts` table to support multiple identities per user over time.
- OAuth sign-in authenticates the external identity and creates or resolves the app user row.
- Book by Book signup is completed separately through `/signup`, which writes nickname/profile fields and sets `signupCompletedAt`.
- Persist app user identity independently from provider email:
  - provider `email` stays nullable and non-authoritative
  - nickname becomes the app’s public identity
- Use JWT session strategy (encrypted JWT in cookie), not database-backed `auth_sessions`.
- Future providers should only require:
  - adding provider config
  - linking provider accounts correctly
  - reusing the same Book by Book app identity once signup is complete

### 7.3 Auth Rules
- `/` is public.
- `/signin` is public.
- `/auth/error` is public.
- `/signup` requires an authenticated session but allows incomplete users.
- All other app routes require both:
  - an authenticated session
  - a completed Book by Book signup
- Callback URLs should be preserved from sign-in through signup completion so users return to their intended destination after onboarding.

## 8) Application Routes (Next.js App Router)

### 8.1 Pages (UI)
- `/` — landing (public)
- `/signin` — auth entry (Google button)
- `/auth/error` — auth failure state
- `/signup` — completed-signup onboarding form for authenticated but incomplete users
- `/books/search` — search Google Books + add to shelves/clubs
- `/books/[googleVolumeId]` — book details (from DB or fetched+cached; store book data in our DB after any user searches for it or tries to add it to a club/shelf)
- `/clubs` — discover public clubs + user’s clubs
- `/clubs/new` — create club
- `/clubs/[clubId]` — club home
- `/clubs/[clubId]/board` — club reading board
- `/clubs/[clubId]/members` — club roster
- `/clubs/[clubId]/manage` — club management landing
- `/clubs/[clubId]/manage/board` — club book management
- `/clubs/[clubId]/manage/members` — member management
- `/clubs/[clubId]/manage/invite` — private invite management for admins
- `/clubs/invitations/[token]` — invite acceptance page
- `/clubs/[clubId]/books/[clubBookId]` — book-in-club page: threads list, create thread
- `/clubs/[clubId]/threads/[threadId]` — thread detail + posts
- `/me` — profile overview
- `/me/shelves` — list shelves
- `/me/shelves/new`
- `/me/shelves/[shelfId]` — shelf detail + items
- `/users/[nickname]/shelves/[shelfId]` — public shelf route for signed-in readers
- `/me/reviewed` — reviewed books list
- `/me/reviews/[googleVolumeId]` — create/edit review for a book

### 8.2 Route Handlers / Server Actions (API)
Prefer Server Actions for mutations; use route handlers for Google Books proxying and if you need REST.

- `GET /api/books/search?q=...`
  - Calls Google Books API, returns normalized results.
- `POST /api/books/import`
  - Body: `{ googleVolumeId }`
  - Upserts into `Book`.

Mutations (Server Actions recommended):
- `completeSignup({ nickname, gender, countryCode, favoriteGenres, betaInvitationCode, callbackUrl? })`
- `createClub({ name, description, visibility })`
- `updateClub(clubId, { ... })`
- `inviteToClub(clubId, { nickname })`
- `acceptInvite(token)` / `joinClub(clubId)` (public club self-join)
- `addBookToClub(clubId, bookId, status)`
- `moveClubBook(clubBookId, status, sortOrder?)`
- `removeClubBook(clubBookId)`
- `createThread(clubBookId, { title, body? })`
- `createPost(threadId, { body })`
- `editPost(postId, { body })`
- `deletePost(postId)`
- `createShelf({ name, description, isPublic, slug? })`
- `addShelfItem(shelfId, bookId, note?, sortOrder?)`
- `removeShelfItem(shelfId, bookId)`
- `upsertReview(bookId, { rating, title, body, containsSpoilers })`
- `deleteReview(bookId)`

## 9) UI/UX Spec (shadcn/ui)

### 9.1 Design System
Use shadcn/ui primitives:
- Button, Card, Badge, Tabs, Dialog, Drawer (mobile), DropdownMenu
- Form, Input, Textarea, Select, Popover, Command (search combobox)
- Avatar, Separator, Skeleton, Toast/Sonner

### 9.2 Key Screens
Signup (`/signup`)
- Authenticated-only onboarding surface.
- Collect:
  - nickname
  - gender
  - country
  - favorite genres (grouped multi-select)
  - beta invitation code
- Preserve callback destination and redirect there after successful completion.

Club Home (`/clubs/[clubId]`)
- Header: club name, visibility badge, join/leave buttons (as applicable), settings/manage affordances for admins.
- 3-section layout:
  - Tabs on mobile (Want to Read / Reading / Read)
  - 3 columns on desktop (optional; tabs also acceptable)
- Each book card:
  - thumbnail, title, authors
  - “Open” button to book-in-club page
  - Admin controls: move status, remove, reorder

Book-in-Club (`/clubs/[clubId]/books/[clubBookId]`)
- Book header with metadata
- Thread list
- “Create thread” button opens dialog
- Sorting: newest, pinned first

Thread Detail (`/clubs/[clubId]/threads/[threadId]`)
- Thread header: title, author nickname, timestamps
- Post composer at bottom (or top on desktop)
- Posts list with edit/delete for author

Personal Shelves (`/me/shelves`)
- List shelves with count of items
- Create shelf dialog/page

Public Shelf (`/users/[nickname]/shelves/[shelfId]`)
- Read-only shelf view for signed-in readers
- Owner shown by nickname
- Keep shelfId in URL for stable lookup

Reviews
- Book page shows:
  - user’s review (if exists) + edit
  - aggregate list of reviews
- `/me/reviewed` shows all reviewed books with rating snippet
- Review author identity uses nickname

## 10) Responsive Design Guide (Must Follow)

### 10.1 Principles
- Mobile-first layout with Tailwind breakpoints:
  - `sm` (≥640px), `md` (≥768px), `lg` (≥1024px), `xl` (≥1280px)
- Avoid fixed widths; use `max-w-*`, `w-full`, responsive grid/flex.
- Use Tabs or Accordion for multi-column content on mobile.
- Use Drawer (shadcn) instead of modal dialogs on small screens for long forms.

### 10.2 Layout Patterns
Global Container
- Use:
  - `max-w-6xl mx-auto px-4 sm:px-6 lg:px-8`
- Keep primary actions visible without horizontal scrolling.

Club Sections (3 lists)
- Mobile (<`md`):
  - Use Tabs for section switching.
  - Each tab shows a vertical list.
- Desktop (≥`lg`):
  - Use `grid grid-cols-3 gap-4` for three columns or keep tabs if simpler.
- Ensure book cards are touch-friendly:
  - minimum tap targets 44px height

Thread Page
- Mobile:
  - Post composer as sticky bottom bar with safe padding.
  - Use expanding Textarea.
- Desktop:
  - Composer can be above list or below; no sticky needed.

Navigation
- Mobile:
  - Consider a bottom nav with 3–4 destinations: Clubs, Search, Shelves, Profile.
  - Or a hamburger menu using Sheet.
- Desktop:
  - Top nav with persistent links.

### 10.3 Performance / UX on Mobile
- Use `next/image` for thumbnails with proper `sizes`.
- Skeleton loaders for lists.
- Avoid rendering huge lists; paginate threads and posts.
- Use server components for read-heavy pages; client components only where needed.

## 11) Validation & Constraints

### 11.1 Input Validation (Zod)
- Nickname:
  - required
  - immutable after signup in Milestone 5
  - 3–20 characters
  - lowercase only
  - allowed characters: `[a-z0-9_-]`
- Gender:
  - required
  - one of `MAN`, `WOMAN`, `NON_BINARY`, `PREFER_NOT_TO_SAY`
- Country:
  - required
  - stored as ISO 3166-1 alpha-2 country code
- Favorite genres:
  - required
  - at least one selection
  - allowed values:
    - Fiction: `Fantasy`, `Sci-Fi`, `Mystery & Crime`, `Thriller & Suspense`, `Romance`, `Historical Fiction`, `Horror`, `Literary Fiction`
    - Non-Fiction: `Biography & Autobiography`, `Memoir`, `History`, `True Crime`, `Personal Development`, `Science`, `Philosophy`, `Travel`, `Business & Economics`, `Cooking & Food`, `Essays & Journalism`
- Club name: 2–60 chars
- Thread title: 2–120 chars
- Post body: 1–10,000 chars
- Review rating: integer 1..5 (optional)
- Shelf name: 1–60 chars
- Invitation expiry: default 7 days
- Beta invitation code:
  - required at signup completion
  - must match `BETA_INVITATION_CODE`

### 11.2 Database Constraints
- `User.nickname` unique
- `Book.googleVolumeId` unique
- `ClubMember(clubId, userId)` unique
- Pending `ClubInvitation(clubId, invitedUserId)` unique
- `ClubBook(clubId, bookId)` unique
- `ShelfItem(shelfId, bookId)` unique
- `Review(userId, bookId)` unique

## 12) Security Requirements
- All core mutations require an authenticated, signed-up user except `completeSignup`.
- `completeSignup` requires an authenticated session and must reject already-completed users.
- Beta invitation code must be validated server-side against `BETA_INVITATION_CODE`.
- Never store or log the raw beta invitation code.
- Nickname uniqueness and normalization must be enforced on the server, not only in the client.
- Invitation token must be:
  - cryptographically random (for example 32+ bytes)
  - stored hashed
- Protect Google Books API key by proxying requests server-side.
- Prevent IDOR:
  - always scope club queries by membership and role checks
  - for shelves, always resolve ownership internally by userId after nickname lookup
- Provider email must not be used as the authoritative identity for authorization or invite acceptance.

## 13) MVP Milestones

### Milestone 1 — Auth + Books
- Auth foundation
  - Google OAuth login via NextAuth
  - JWT cookie session strategy (`auth_sessions` table removed)
  - Route/API protection via `proxy.ts`
  - Custom themed auth pages (`/signin`, `/auth/error`)
  - Foundation profile menu + profile page (`/me`)
- Books foundation
  - Google Books API integration via API key
  - Search page (`/books/search`) with:
    - basic mode (`q`) + title-only toggle
    - advanced mode (`title`, `author`, `publisher`, `subject`, `isbn`)
    - basic query syntax support for phrase/include/exclude (`"..."`, `+term`, `-term`)
    - pagination and total-count fallback handling
  - Import flow:
    - server action on search cards
    - API endpoint (`POST /api/books/import`)
    - upsert into local `books` table cache
  - Book detail page (`/books/[googleVolumeId]`) with loader and formatted description rendering
  - In-memory search cache with TTL + cleanup bounds
- Quality checks
  - `pnpm lint`, `pnpm build`
  - Playwright e2e coverage for search UX and toggle behavior

### Milestone 2 — Clubs + Sections
- Create club (public/private)
- Join public club
- Private invite flow for private club management
- Add/move/remove books in club sections (admin)

### Milestone 3 — Threads
- Create thread per clubBook
- Posts, edit/delete own posts
- Basic pagination

### Milestone 4 — Personal Shelves + Reviews
- Create shelves.
- Refactor “Add Book” so it is reusable for both club book addition and shelf item addition.
- Add/remove books from shelves.
- Create/edit/delete review per book.
- Book detail shows review aggregates and recent reviews.
- Profile reviewed list.

### Milestone 5 — Beta Onboarding + Nickname Identity
- Require completed signup after OAuth with:
  - nickname
  - gender
  - country
  - favorite genres
  - beta invitation code
- Redirect incomplete users to `/signup` before app access.
- Use nickname-first display identity across profile, clubs, shelves, threads, and reviews.
- Change public shelf sharing from userId route segments to nickname route segments.
- Change private club invites from email-targeted flow to nickname-targeted flow resolved to `invitedUserId`.
- Add quality coverage for onboarding, auth gating, nickname routing, and nickname-based invites.

## 14) Implementation Notes (Practical Defaults)

### 14.1 Club Creation Default
When a user creates a club:
- Create `Club`
- Create `ClubMember` for creator with role `OWNER`
- `ADMIN` role can be added by owner; admins can manage members and books but cannot delete club or change visibility

### 14.2 Public vs Private Join Logic
- `PUBLIC`: show “Join club” button; joining inserts `ClubMember` immediately
- `PRIVATE`: hide self-join; only invite acceptance can create membership

### 14.3 Thread Eligibility
- Thread creation requires that `ClubBook` exists (book must be in one of the three sections).
- If admin removes the book from the club:
  - keep threads
  - block new thread creation once `removedAt` is set

### 14.4 Sorting within Sections
Use `sortOrder`:
- On add: set `sortOrder = max + 1` in that section.
- On reorder: update affected rows.

### 14.5 Onboarding and Invite Defaults
- OAuth sign-in may create or resolve the user row before signup is complete.
- Incomplete authenticated users are redirected to `/signup` and keep a safe callback URL.
- Completed users hitting `/signup` should be redirected to the callback URL or `/books/search`.
- Milestone 5 does not include nickname changes after signup.
- Milestone 5 private invites can only target existing signed-up users with a nickname.
