# Task 02: Shelf Routes and Public Shelf Reading

## Goal
Ship the initial shelf route tree so users can manage their own shelves and signed-in readers can open public shelves owned by other members.

## Scope
- Implement owner-facing shelf routes:
  - `/me/shelves`
  - `/me/shelves/new`
  - `/me/shelves/[shelfId]`
- Implement a signed-in public shelf route:
  - `/users/[userId]/shelves/[shelfId]`
- Add shelf metadata forms and server actions for:
  - create shelf
  - update shelf name/description/public visibility
  - delete shelf
- Add profile entry points so `/me` links into shelves once the routes exist.

## Implementation Notes
- Use `shelfId` as the route identifier for Milestone 4. Do not introduce slug-based routing or redirects.
- Owner shelf detail and public shelf detail can share the same presentation component if the read-only vs editable behavior stays clear.
- Private shelves must remain owner-only even if another signed-in user knows the route.
- Public shelf pages remain inside auth; do not add unauthenticated shelf pages or landing-page links.
- Deleting a shelf should rely on the existing `ON DELETE CASCADE` relationship for `shelf_items`.

## Acceptance Criteria
- Users can create a shelf from `/me/shelves/new` and land on a usable shelf detail page.
- `/me/shelves` lists the current user's shelves with enough metadata to distinguish public vs private shelves.
- Users can update and delete only their own shelves.
- Signed-in non-owners can open a public shelf by `/users/[userId]/shelves/[shelfId]` and cannot modify it.
- Signed-in non-owners receive a protected failure state for private shelves they do not own.

## Expected Touchpoints
- `app/(protected)/me/page.tsx`
- `app/(protected)/me/shelves/**/*`
- `app/(protected)/users/[userId]/shelves/[shelfId]/page.tsx`
- `components/shelves/*`
- `app/(protected)/clubs/actions.ts` or a new shelf action module
