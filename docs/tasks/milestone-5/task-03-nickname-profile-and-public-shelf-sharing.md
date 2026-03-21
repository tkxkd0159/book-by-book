# Task 03: Nickname Profile and Public Shelf Sharing

## Goal
Make nickname the default user-facing identity and switch public shelf sharing from userId-based URLs to nickname-based URLs.

## Scope
- Update profile surfaces so `/me` reflects the completed Book by Book profile:
  - nickname as the primary identity
  - gender
  - country
  - favorite genres
  - provider email only as secondary account metadata
- Replace provider name/email as the default public display identity across:
  - profile menu
  - club member summaries
  - thread author labels
  - review author labels
  - shelf owner labels
- Change public shelf path generation from `/users/[userId]/shelves/[shelfId]` to `/users/[nickname]/shelves/[shelfId]`.
- Update public shelf route loading so nickname resolves to the owner user first, then reuses the same shelf visibility and ownership checks.
- Update public shelf copy and share affordances to reference nickname-driven sharing.

## Implementation Notes
- Keep `shelfId` in the public shelf URL so Milestone 5 changes only the owner segment, not the shelf identifier model.
- Do not add a general public profile page in this milestone; only the public shelf route changes.
- Gender, country, and favorite genres remain owner-profile data; milestone scope does not require surfacing those fields publicly outside `/me`.
- Centralize nickname-first display logic in shared helpers so threads, reviews, clubs, and shelf surfaces stay consistent.
- Preserve the current signed-in-only access model for public shelf reading.

## Acceptance Criteria
- `/me` clearly shows nickname as the primary Book by Book identity and surfaces the new profile fields.
- Shared UI components and read surfaces display nickname consistently instead of provider name/email.
- Public shelf links and route helpers generate nickname-based paths.
- Public shelf reads continue to enforce the same visibility rules after nickname lookup.
- Existing shelf CRUD and public-read flows stay intact apart from the owner route segment change.

## Expected Touchpoints
- `app/(protected)/me/page.tsx`
- `app/(protected)/users/[nickname]/shelves/[shelfId]/page.tsx` or equivalent
- `lib/shelves/view-paths.ts`
- `lib/shelves/*`
- `components/auth/*`
- `components/clubs/*`
- `components/threads/*`
- `components/reviews/*`
