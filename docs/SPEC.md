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

See [`db/schema/data.sql`](./db/schema/data.sql) for the full SQL schema definition.

Schema and migration workflow:
- `db/schema/data.sql` is continuously updated and is the latest source-of-truth schema.
- Use `db/schema/data.sql` directly when provisioning a fresh database (e2e/local/new deployment environment).
- For any schema/index/constraint change, append a new sequential migration SQL file in `db/migrations/` for production rollout.
- Keep existing migrations immutable; do not modify `db/migrations/1_baseline.sql`.

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

Milestone 1 — Auth + Books (current implemented scope)
- Auth foundation
  - Google OAuth login via NextAuth
  - JWT cookie session strategy (`auth_sessions` table removed)
  - Route/API protection via `proxy.ts`
  - Custom themed auth pages (`/signin`, `/auth/error`)
  - Profile menu + profile page (`/me`)
- Books foundation
  - Google Books API integration via API key
  - Search page (`/books/search`) with:
    - Basic mode (`q`) + title-only toggle
    - Advanced mode (`title`, `author`, `publisher`, `subject`, `isbn`)
    - Basic query syntax support for phrase/include/exclude (`"..."`, `+term`, `-term`)
    - Pagination and total-count fallback handling
  - Import flow:
    - Server action on search cards
    - API endpoint (`POST /api/books/import`)
    - Upsert into local `books` table cache
  - Book detail page (`/books/[googleVolumeId]`) with loader and formatted description rendering
  - In-memory search cache with TTL + cleanup bounds
- Quality checks
  - `pnpm lint`, `pnpm build`
  - Playwright e2e coverage for search UX and toggle behavior

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
- Create shelves. We need to refactor "Add Book" feature to be reusable for both club book addition and shelf item addition, since both require adding a book to the DB by googleVolumeId.
- Add/remove books from shelves
- Create/edit/delete review per book. If any user leaves a review, the book data will be saved in our DB like "Add Book" flow, so we can show the review on the book detail page and link to the book from the profile. User can set rating from 1 to 5 starts and write a review body. We can show the average rating on the book detail page as well by calculating the average of all reviews for that book.
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
